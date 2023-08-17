/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;

describe("Add liquidity contract", function () {
    let FconRouter, fconRouter, WETH, weth, owner, addr1, addr2, treasury;
    const initialLiquidity = ethers.utils.parseEther("1000");
    const secondLiquidity = ethers.utils.parseEther("1500");

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

        FconRouter = await ethers.getContractFactory("FconRouter");
        fconRouter = await FconRouter.deploy(fconFactory.address, weth.address);

        // Approve tokens for router contract
        await weth.connect(owner).approve(fconRouter.address, initialLiquidity);
        await token0.connect(owner).approve(fconRouter.address, initialLiquidity);
        await token1.connect(owner).approve(fconRouter.address, initialLiquidity);

        // Set feeTo
        await fconFactory.connect(owner).setFeeTo(treasury.address);
    });

    describe.only("addLiquidity", function () {
        it("should add liquidity correctly when fee = 0%", async function () {
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
            const pairAddress = await fconFactory.getPair(token0.address, token1.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();
            expect(totalSupply).to.gt(0);
        });
        it("should add liquidity correctly when fee = 10%", async function () {
            // Set fee %
            const swapFee = 0;
            const liquidityFee = 10000;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            const balanceToken0Before = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceToken1Before = await token1.connect(treasury).balanceOf(treasury.address);

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

            const pairAddress = await fconFactory.getPair(token0.address, token1.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();

            const balanceToken0After = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceToken1After = await token1.connect(treasury).balanceOf(treasury.address);

            expect(totalSupply).to.gt(0);
            expect(balanceToken0After.sub(balanceToken0Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceToken1After.sub(balanceToken1Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
        });
        it("should re-add liquidity correctly when fee = 10%", async function () {
            // Set fee %
            const swapFee = 0;
            const liquidityFee = 10000;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            const balanceToken0Before = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceToken1Before = await token1.connect(treasury).balanceOf(treasury.address);

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

            const pairAddress = await fconFactory.getPair(token0.address, token1.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();

            const balanceToken0AfterFirstLiquidityAdd = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceToken1AfterFirstLiquidityAdd = await token1.connect(treasury).balanceOf(treasury.address);

            // Approve tokens for router contract second time
            await weth.connect(owner).approve(fconRouter.address, secondLiquidity);
            await token0.connect(owner).approve(fconRouter.address, secondLiquidity);
            await token1.connect(owner).approve(fconRouter.address, secondLiquidity);

            await fconRouter.connect(owner).addLiquidity(
                token0.address,
                token1.address,
                secondLiquidity,
                secondLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256
            );

            const balanceToken0AfterSecondLiquidityAdd = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceToken1AfterSecondLiquidityAdd = await token1.connect(treasury).balanceOf(treasury.address);

            expect(balanceToken0AfterFirstLiquidityAdd.sub(balanceToken0Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceToken1AfterFirstLiquidityAdd.sub(balanceToken1Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))

            expect(balanceToken0AfterSecondLiquidityAdd.sub(balanceToken0AfterFirstLiquidityAdd)).to.eq((secondLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceToken1AfterSecondLiquidityAdd.sub(balanceToken1AfterFirstLiquidityAdd)).to.eq((secondLiquidity.mul(liquidityFee / 2)).div(1000000))
        });
    });

    describe("addLiquidityETH", function () {
        it("should add liquidity ETH correctly when fee = 0%", async function () {
            // Approve tokens for router contract
            await token0.connect(owner).approve(fconRouter.address, initialLiquidity);

            const balanceBefore = await owner.getBalance();

            await fconRouter.addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const pairAddress = await fconFactory.getPair(token0.address, weth.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();
            const balanceAfter = await owner.getBalance();

            expect(totalSupply).to.gt(0);
        });
        it("should add liquidity ETH correctly when fee = 10%", async function () {
            // Set fee %
            const swapFee = 0;
            const liquidityFee = 10000;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            const balanceToken0Before = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHBefore = await weth.balanceOf(treasury.address);
            const balanceETHBefore = await treasury.getBalance();

            await fconRouter.addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const pairAddress = await fconFactory.getPair(token0.address, weth.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();
            const balanceToken0After = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHAfter = await weth.balanceOf(treasury.address);
            const balanceETHAfter = await treasury.getBalance();

            expect(totalSupply).to.gt(0);
            expect(balanceToken0After.sub(balanceToken0Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceWETHAfter.sub(balanceWETHBefore)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
        });
        it("should re-add liquidity ETH correctly when fee = 10%", async function () {
            // Set fee %
            const swapFee = 0;
            const liquidityFee = 10000;
            await fconFactory.connect(owner).setFees(swapFee, liquidityFee);

            const balanceToken0Before = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHBefore = await weth.balanceOf(treasury.address);
            const balanceETHBefore = await treasury.getBalance();

            await fconRouter.addLiquidityETH(
                token0.address,
                initialLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: initialLiquidity }
            );

            const pairAddress = await fconFactory.getPair(token0.address, weth.address);
            const pair = await ethers.getContractAt("FconPair", pairAddress);
            const totalSupply = await pair.totalSupply();

            const balanceToken0AfterFirstLiquidityAdd = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHAfterFirstLiquidityAdd = await weth.balanceOf(treasury.address);

            const balanceETHAfterFirstLiquidityAdd = await treasury.getBalance();

            // Approve tokens for router contract second time
            await weth.connect(owner).approve(fconRouter.address, secondLiquidity);
            await token0.connect(owner).approve(fconRouter.address, secondLiquidity);

            await fconRouter.connect(owner).addLiquidityETH(
                token0.address,
                secondLiquidity,
                0,
                0,
                owner.address,
                ethers.constants.MaxUint256,
                { value: secondLiquidity }
            );

            const balanceToken0AfterSecondLiquidityAdd = await token0.connect(treasury).balanceOf(treasury.address);
            const balanceWETHAfterSecondLiquidityAdd = await weth.balanceOf(treasury.address);

            const balanceETHAfterSecondLiquidityAdd = await treasury.getBalance();

            expect(balanceToken0AfterFirstLiquidityAdd.sub(balanceToken0Before)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceWETHAfterFirstLiquidityAdd.sub(balanceWETHBefore)).to.eq((initialLiquidity.mul(liquidityFee / 2)).div(1000000))

            expect(balanceToken0AfterSecondLiquidityAdd.sub(balanceToken0AfterFirstLiquidityAdd)).to.eq((secondLiquidity.mul(liquidityFee / 2)).div(1000000))
            expect(balanceWETHAfterSecondLiquidityAdd.sub(balanceWETHAfterFirstLiquidityAdd)).to.eq((secondLiquidity.mul(liquidityFee / 2)).div(1000000))
        });
    });
});
