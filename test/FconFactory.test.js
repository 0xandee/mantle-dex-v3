/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FconFactory", function () {
  let FconFactory,
    fconFactory,
    feeToSetter,
    feeTo,
    tokenA,
    tokenB,
    addr1,
    addr2;

  beforeEach(async () => {
    FconFactory = await ethers.getContractFactory("FconFactory");
    [feeToSetter, feeTo, tokenA, tokenB, addr1, addr2, _] =
      await ethers.getSigners();

    fconFactory = await FconFactory.deploy(feeToSetter.address);
  });

  it("Initializes the contract with correct feeToSetter", async function () {
    expect(await fconFactory.feeToSetter()).to.equal(feeToSetter.address);
  });

  it("Sets feeTo correctly", async function () {
    await fconFactory.connect(feeToSetter).setFeeTo(feeTo.address);
    expect(await fconFactory.feeTo()).to.equal(feeTo.address);
  });

  it("Reverts on setFeeTo from unauthorized address", async function () {
    await expect(
      fconFactory.connect(addr1).setFeeTo(feeTo.address)
    ).to.be.revertedWith("Fcon: FORBIDDEN");
  });

  it("Sets feeToSetter correctly", async function () {
    await fconFactory.connect(feeToSetter).setFeeToSetter(addr1.address);
    expect(await fconFactory.feeToSetter()).to.equal(addr1.address);
  });

  it("Reverts on setFeeToSetter from unauthorized address", async function () {
    await expect(
      fconFactory.connect(addr1).setFeeToSetter(addr1.address)
    ).to.be.revertedWith("Fcon: FORBIDDEN");
  });

  it("Sets fees correctly", async function () {
    const swapFee = 1;
    const liquidityFee = 2;
    await fconFactory.connect(feeToSetter).setFees(swapFee, liquidityFee);
    expect(await fconFactory.swapFee()).to.equal(swapFee);
    expect(await fconFactory.liquidityFee()).to.equal(liquidityFee);
  });

  it("Reverts on setFees from unauthorized address", async function () {
    const swapFee = 1;
    const liquidityFee = 2;
    await expect(
      fconFactory.connect(addr1).setFees(swapFee, liquidityFee)
    ).to.be.revertedWith("Fcon: FORBIDDEN");
  });

  it("Creates pair correctly", async function () {
    await fconFactory
      .connect(feeToSetter)
      .createPair(tokenA.address, tokenB.address);
    expect(
      await fconFactory.getPair(tokenA.address, tokenB.address)
    ).to.not.equal(ethers.constants.AddressZero);
    expect(await fconFactory.allPairsLength()).to.equal(1);
  });

  it("Reverts on createPair with identical addresses", async function () {
    await expect(
      fconFactory
        .connect(feeToSetter)
        .createPair(tokenA.address, tokenA.address)
    ).to.be.revertedWith("Fcon: IDENTICAL_ADDRESSES");
  });

  it("Reverts on createPair with zero address", async function () {
    await expect(
      fconFactory
        .connect(feeToSetter)
        .createPair(ethers.constants.AddressZero, tokenB.address)
    ).to.be.revertedWith("Fcon: ZERO_ADDRESS");
  });

  it("Reverts on createPair when pair exists", async function () {
    await fconFactory
      .connect(feeToSetter)
      .createPair(tokenA.address, tokenB.address);
    await expect(
      fconFactory
        .connect(feeToSetter)
        .createPair(tokenA.address, tokenB.address)
    ).to.be.revertedWith("Fcon: PAIR_EXISTS");
  });
});
