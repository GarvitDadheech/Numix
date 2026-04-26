// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NumixEscrow
 * @notice Escrow contract for 1v1 math duel wagers on World Chain.
 *
 * Payment flow:
 *  1. Both players call MiniKit.pay() which sends WLD directly to this contract.
 *  2. The off-chain resolver backend detects both payments and calls createGame()
 *     to register the match on-chain (funds are already held by this contract).
 *  3. After the duel finishes, the resolver calls resolveGame() (winner takes 90%)
 *     or resolveGameTie() (full refund) or cancelGame() (full refund, pre-start).
 *
 * A 10% platform fee is sent to the contract owner on a winner-takes-all resolution.
 */
contract NumixEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice World-chain WLD token address (checksummed).
    address public constant WLD_TOKEN =
        0x163f8C2467924be0ae7B5347228CABF260318753;

    /// @notice Winner receives 90% of the total pot.
    uint256 public constant WINNER_BPS = 9000;

    /// @notice Platform fee is 10% of the total pot.
    uint256 public constant FEE_BPS = 1000;

    uint256 private constant BPS_DENOM = 10_000;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum GameStatus {
        Pending,    // registered but not yet active (unused in current flow — reserved)
        Active,     // funds locked, duel in progress
        Finished,   // resolved (winner paid out)
        Cancelled   // refunded
    }

    struct Game {
        address player1;
        address player2;
        uint256 stakeAmount; // each player's individual stake (NOT the combined pot)
        GameStatus status;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Address authorised to create and resolve games.
    address public resolver;

    /// @notice gameId => Game
    mapping(bytes32 => Game) private games;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event GameCreated(
        bytes32 indexed gameId,
        address indexed player1,
        address indexed player2,
        uint256 stakeAmount
    );

    event GameResolved(
        bytes32 indexed gameId,
        address indexed winner,
        uint256 winnerPayout,
        uint256 feePaid
    );

    event GameTied(
        bytes32 indexed gameId,
        address indexed player1,
        address indexed player2,
        uint256 refundAmount
    );

    event GameCancelled(
        bytes32 indexed gameId,
        address indexed player1,
        address indexed player2,
        uint256 refundAmount
    );

    event ResolverUpdated(address indexed oldResolver, address indexed newResolver);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyResolver() {
        require(msg.sender == resolver, "NumixEscrow: caller is not resolver");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param _resolver  Address of the trusted off-chain resolver backend.
     *                   The deployer becomes the contract owner (via Ownable).
     */
    constructor(address _resolver) Ownable(msg.sender) {
        require(_resolver != address(0), "NumixEscrow: zero resolver address");
        resolver = _resolver;
    }

    // -------------------------------------------------------------------------
    // Resolver-only functions
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new game once both players have already sent their WLD
     *         stakes to this contract via MiniKit.pay().
     *
     * @dev    The resolver is responsible for verifying that sufficient WLD
     *         balance has arrived before calling this function.  The contract
     *         does NOT pull tokens; it only records the game and marks it Active.
     *
     * @param gameId       Unique identifier for the game (e.g., keccak256 of a UUID).
     * @param player1      Address of the first player.
     * @param player2      Address of the second player.
     * @param stakeAmount  Amount each player wagered (in WLD wei).
     */
    function createGame(
        bytes32 gameId,
        address player1,
        address player2,
        uint256 stakeAmount
    ) external onlyResolver nonReentrant {
        require(games[gameId].player1 == address(0), "NumixEscrow: game already exists");
        require(player1 != address(0), "NumixEscrow: zero player1 address");
        require(player2 != address(0), "NumixEscrow: zero player2 address");
        require(player1 != player2, "NumixEscrow: players must be different");
        require(stakeAmount > 0, "NumixEscrow: stake must be > 0");

        // Sanity-check: contract must hold at least the combined pot.
        uint256 pot = stakeAmount * 2;
        require(
            IERC20(WLD_TOKEN).balanceOf(address(this)) >= pot,
            "NumixEscrow: insufficient WLD balance for stake"
        );

        games[gameId] = Game({
            player1: player1,
            player2: player2,
            stakeAmount: stakeAmount,
            status: GameStatus.Active
        });

        emit GameCreated(gameId, player1, player2, stakeAmount);
    }

    /**
     * @notice Resolve an active game with a declared winner.
     *         Winner receives 90% of the pot; owner receives 10% as platform fee.
     *
     * @param gameId  The game to resolve.
     * @param winner  Must be either player1 or player2.
     */
    function resolveGame(
        bytes32 gameId,
        address winner
    ) external onlyResolver nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Active, "NumixEscrow: game not active");
        require(
            winner == game.player1 || winner == game.player2,
            "NumixEscrow: winner is not a participant"
        );

        game.status = GameStatus.Finished;

        uint256 pot = game.stakeAmount * 2;
        uint256 winnerPayout = (pot * WINNER_BPS) / BPS_DENOM;
        uint256 fee = pot - winnerPayout; // avoids any rounding residue

        IERC20(WLD_TOKEN).safeTransfer(winner, winnerPayout);
        IERC20(WLD_TOKEN).safeTransfer(owner(), fee);

        emit GameResolved(gameId, winner, winnerPayout, fee);
    }

    /**
     * @notice Resolve an active game as a tie — both players receive their
     *         exact stake back (no platform fee on a tie).
     *
     * @param gameId  The game to resolve as a tie.
     */
    function resolveGameTie(bytes32 gameId) external onlyResolver nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Active, "NumixEscrow: game not active");

        game.status = GameStatus.Finished;

        uint256 refund = game.stakeAmount;
        IERC20(WLD_TOKEN).safeTransfer(game.player1, refund);
        IERC20(WLD_TOKEN).safeTransfer(game.player2, refund);

        emit GameTied(gameId, game.player1, game.player2, refund);
    }

    /**
     * @notice Cancel an active game and fully refund both players.
     *         Intended for timeouts, disconnects, or other abort scenarios.
     *
     * @param gameId  The game to cancel.
     */
    function cancelGame(bytes32 gameId) external onlyResolver nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Active, "NumixEscrow: game not active");

        game.status = GameStatus.Cancelled;

        uint256 refund = game.stakeAmount;
        IERC20(WLD_TOKEN).safeTransfer(game.player1, refund);
        IERC20(WLD_TOKEN).safeTransfer(game.player2, refund);

        emit GameCancelled(gameId, game.player1, game.player2, refund);
    }

    // -------------------------------------------------------------------------
    // Owner-only admin functions
    // -------------------------------------------------------------------------

    /**
     * @notice Update the resolver address.
     * @param _resolver New resolver address.
     */
    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "NumixEscrow: zero resolver address");
        emit ResolverUpdated(resolver, _resolver);
        resolver = _resolver;
    }

    /**
     * @notice Emergency withdrawal of any ERC-20 token stuck in the contract.
     *         Should only be called if funds are genuinely stranded (e.g., after
     *         all games are finished/cancelled and a residual balance remains).
     *
     * @param token   Token address (use WLD_TOKEN for WLD).
     * @param amount  Amount to withdraw (in token's smallest unit).
     */
    function withdrawStuck(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0), "NumixEscrow: zero token address");
        require(amount > 0, "NumixEscrow: zero amount");
        IERC20(token).safeTransfer(owner(), amount);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Returns full details of a game.
     * @param gameId  The game identifier.
     */
    function getGame(bytes32 gameId) external view returns (Game memory) {
        return games[gameId];
    }
}
