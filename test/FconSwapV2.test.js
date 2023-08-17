/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;

describe("Swap contract", function () {
    let FconRouter, fconRouter, WETH, weth, owner, addr1, addr2, treasury;
    const initialLiquidity = ethers.utils.parseEther("1000");
    const secondLiquidity = ethers.utils.parseEther("1500");
    const initSwapFee = 10; // = 0.001%
    beforeEach(async function () {
        [owner, addr1, addr2, treasury, ...addrs] = await ethers.getSigners();

        Token0 = await ethers.getContractFactory("Token");
        token0 = await Token0.deploy();

        Token1 = await ethers.getContractFactory("Token");
        token1 = await Token1.deploy();

        WETH = await ethers.getContractFactory("WETH9");
        weth = await WETH.deploy();

        FconFactory = await ethers.getContractFactory("FconFactory");
        fconFactory = await FconFactory.deploy(owner.address);

        const init_code_hash = await fconFactory.INIT_CODE_PAIR_HASH();
        // console.log("🚀 ~ file: FconSwapV2.test.js:28 ~ init_code_hash:", init_code_hash)

        FconRouter = await ethers.getContractFactory("FconRouter");
        fconRouter = await FconRouter.deploy(fconFactory.address, weth.address);

        // Approve tokens for router contract
        await weth.connect(owner).approve(fconRouter.address, ethers.constants.MaxUint256);
        await token0.connect(owner).approve(fconRouter.address, ethers.constants.MaxUint256);
        await token1.connect(owner).approve(fconRouter.address, ethers.constants.MaxUint256);

        // Set feeTo
        await fconFactory.connect(owner).setFeeTo(treasury.address);
    });

    describe("swapExactTokensForTokens", function () {
        it("should swap tokens correctly with 0% fee", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidity(
                token0.address,
                token1.address,
                initialLiquidity,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceToken1Before = await token1.balanceOf(owner.address);

            // swap tokens
            await fconRouter.connect(owner).swapExactTokensForTokens(
                initialLiquidity.div(2), // amountIn
                0, // amountOutMin
                [token0.address, token1.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceToken1After = await token1.balanceOf(owner.address);

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceToken1After).to.gt(balanceToken1Before);
        });
        it("should swap tokens correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidity(
                token0.address,
                token1.address,
                initialLiquidity,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceToken1Before = await token1.balanceOf(owner.address);
            const balanceToken0TreasuryBefore = await token0.connect(treasury).balanceOf(treasury.address);

            // swap tokens
            await fconRouter.connect(owner).swapExactTokensForTokens(
                initialLiquidity.div(2), // amountIn
                0, // amountOutMin
                [token0.address, token1.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceToken1After = await token1.balanceOf(owner.address);
            const balanceToken0TreasuryAfter = await token0.connect(treasury).balanceOf(treasury.address);

            expect(balanceToken0Before.sub(balanceToken0After)).to.eq(initialLiquidity.div(2));
            expect(balanceToken0TreasuryAfter.sub(balanceToken0TreasuryBefore)).to.gt(0);
        });
    });

    describe("swapExactETHForTokens", function () {
        it("should swap ETH for tokens correctly", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceETHBefore = await owner.getBalance();
            const balanceToken0Before = await token0.balanceOf(owner.address);

            // swap ETH for tokens
            await fconRouter.connect(owner).swapExactETHForTokens(
                0, // amountOutMin
                [weth.address, token0.address], // path
                owner.address, // to
                ethers.constants.MaxUint256, // deadline
                { value: initialLiquidity.div(2) } // amountIn
            );

            const balanceETHAfter = await owner.getBalance();
            const balanceToken0After = await token0.balanceOf(owner.address);

            expect(balanceETHAfter).to.lt(balanceETHBefore);
            expect(balanceToken0After).to.gt(balanceToken0Before);
        });
        it("should swap ETH for tokens correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceETHBefore = await owner.getBalance();
            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceToken0TreasuryBefore = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHBefore = await weth.balanceOf(treasury.address);
            console.log("🚀 ~ file: FconSwapV2.test.js:166 ~ balanceWETHBefore:", balanceWETHBefore)

            // swap ETH for tokens
            await fconRouter.connect(owner).swapExactETHForTokens(
                0, // amountOutMin
                [weth.address, token0.address], // path
                owner.address, // to
                ethers.constants.MaxUint256, // deadline
                { value: initialLiquidity.div(2) } // amountIn
            );

            const balanceETHAfter = await owner.getBalance();
            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceToken0TreasuryAfter = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHAfter = await weth.balanceOf(treasury.address);
            console.log("🚀 ~ file: FconSwapV2.test.js:181 ~ balanceWETHAfter:", balanceWETHAfter)

            expect(balanceETHAfter).to.lt(balanceETHBefore);
            expect(balanceToken0After).to.gt(balanceToken0Before);
            expect(balanceWETHAfter.sub(balanceWETHBefore)).to.gt(0);
        });
    });

    describe('swapExactTokensForETH', function () {
        it("should swap tokens for ETH correctly", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceETHBefore = await owner.getBalance();

            // swap tokens for ETH
            await fconRouter.connect(owner).swapExactTokensForETH(
                initialLiquidity.div(2), // amountIn
                0, // amountOutMin
                [token0.address, weth.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceETHAfter = await owner.getBalance();

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceETHAfter).to.gt(balanceETHBefore);
        });
        it("should swap tokens for ETH correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceETHBefore = await owner.getBalance();
            const balanceToken0TreasuryBefore = await token0.connect(treasury).balanceOf(treasury.address);

            // swap tokens for ETH
            await fconRouter.connect(owner).swapExactTokensForETH(
                initialLiquidity.div(2), // amountIn
                0, // amountOutMin
                [token0.address, weth.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceETHAfter = await owner.getBalance();
            const balanceToken0TreasuryAfter = await token0.connect(treasury).balanceOf(treasury.address);

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceETHAfter).to.gt(balanceETHBefore);
            expect(balanceToken0TreasuryAfter.sub(balanceToken0TreasuryBefore)).to.gt(0);
        });
    });

    describe('swapTokensForExactTokens', () => {
        it("should swap tokens for exact tokens correctly", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidity(
                token0.address,
                token1.address,
                initialLiquidity,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceToken1Before = await token1.balanceOf(owner.address);

            // swap tokens for exact tokens
            await fconRouter.connect(owner).swapTokensForExactTokens(
                initialLiquidity.div(2), // amountOut
                ethers.constants.MaxUint256, // amountInMax
                [token0.address, token1.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceToken1After = await token1.balanceOf(owner.address);

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceToken1After).to.gt(balanceToken1Before);
        });
        it("should swap tokens for exact tokens correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidity(
                token0.address,
                token1.address,
                initialLiquidity,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceToken1Before = await token1.balanceOf(owner.address);
            const balanceToken0TreasuryBefore = await token0.balanceOf(treasury.address);

            // swap tokens for exact tokens
            await fconRouter.connect(owner).swapTokensForExactTokens(
                initialLiquidity.div(2), // amountOut
                ethers.constants.MaxUint256, // amountInMax
                [token0.address, token1.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceToken1After = await token1.balanceOf(owner.address);
            const balanceToken0TreasuryAfter = await token0.balanceOf(treasury.address);

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceToken1After).to.gt(balanceToken1Before);
            expect(balanceToken0TreasuryAfter.sub(balanceToken0TreasuryBefore)).to.gt(0);

        });
    })

    describe('swapTokensForExactETH', () => {
        it("should swap tokens for exact ETH correctly", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceETHBefore = await owner.getBalance();

            // swap tokens for exact ETH
            await fconRouter.connect(owner).swapTokensForExactETH(
                initialLiquidity.div(2), // amountOut
                ethers.constants.MaxUint256, // amountInMax
                [token0.address, weth.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceETHAfter = await owner.getBalance();

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceETHAfter).to.gt(balanceETHBefore);
        });
        it("should swap tokens for exact ETH correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceETHBefore = await owner.getBalance();
            const balanceToken0TreasuryBefore = await token0.balanceOf(treasury.address);

            // swap tokens for exact ETH
            await fconRouter.connect(owner).swapTokensForExactETH(
                initialLiquidity.div(2), // amountOut
                ethers.constants.MaxUint256, // amountInMax
                [token0.address, weth.address], // path
                owner.address, // to
                ethers.constants.MaxUint256 // deadline
            );

            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceETHAfter = await owner.getBalance();
            const balanceToken0TreasuryAfter = await token0.balanceOf(treasury.address);

            expect(balanceToken0After).to.lt(balanceToken0Before);
            expect(balanceETHAfter).to.gt(balanceETHBefore);
            expect(balanceToken0TreasuryAfter.sub(balanceToken0TreasuryBefore)).to.gt(0);

        });
    })

    describe('swapETHForExactTokens', () => {
        it("should swap ETH for exact tokens correctly", async function () {
            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceETHBefore = await owner.getBalance();
            const balanceToken0Before = await token0.balanceOf(owner.address);

            // swap ETH for exact tokens
            await fconRouter.connect(owner).swapETHForExactTokens(
                1000, // amountOut
                [weth.address, token0.address], // path
                owner.address, // to
                ethers.constants.MaxUint256, // deadline
                { value: 1003 } // amountInMax
            );

            const balanceETHAfter = await owner.getBalance();
            const balanceToken0After = await token0.balanceOf(owner.address);

            expect(balanceETHAfter).to.lt(balanceETHBefore);
            expect(balanceToken0After).to.gt(balanceToken0Before);
        });
        it("should swap ETH for exact tokens correctly with 10% fee", async function () {
            // Set fee %
            const swapFee = initSwapFee;
            const liquidityFee = 0;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            // provide liquidity first
            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const balanceETHBefore = await owner.getBalance();
            const balanceToken0Before = await token0.balanceOf(owner.address);
            const balanceWETHBefore = await weth.balanceOf(treasury.address);

            // swap ETH for exact tokens
            await fconRouter.connect(owner).swapETHForExactTokens(
                1000000, // amountOut
                [weth.address, token0.address], // path
                owner.address, // to
                ethers.constants.MaxUint256, // deadline
                { value: 1103000 } // amountInMax
            );

            const balanceETHAfter = await owner.getBalance();
            const balanceToken0After = await token0.balanceOf(owner.address);
            const balanceWETHAfter = await weth.balanceOf(treasury.address);

            expect(balanceETHAfter).to.lt(balanceETHBefore);
            expect(balanceToken0After).to.gt(balanceToken0Before);
            expect(balanceWETHAfter.sub(balanceWETHBefore)).to.gt(0);
        });
    })
});
