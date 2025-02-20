const {
  Commitment,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  Transaction,
} =require ("@solana/web3.js");
const { Program, Provider } =require ("@coral-xyz/anchor");
const { GlobalAccount } =require ("./globalAccount.js");
const {
  toCompleteEvent,
  toCreateEvent,
  toSetParamsEvent,
  toTradeEvent,
} =require ("./events.js");
const {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} =require ("@solana/spl-token");
const { BondingCurveAccount } =require ("./bondingCurveAccount.js");
const { BN } =require ("bn.js");
const {
  DEFAULT_COMMITMENT,
  DEFAULT_FINALITY,
  calculateWithSlippageBuy,
  calculateWithSlippageSell,
  sendTx,
  sendTxToJito,
} =require ("./util.js");
const { PumpFun, IDL } =require ("./IDL/index.js");
const {wallet} = require("../../../helpers/config.js")
const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const MPL_TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

 const GLOBAL_ACCOUNT_SEED = "global";
 const MINT_AUTHORITY_SEED = "mint-authority";
 const BONDING_CURVE_SEED = "bonding-curve";
 const METADATA_SEED = "metadata";

 const DEFAULT_DECIMALS = 6;

 class PumpFunSDK {

  constructor(provider) {
    this.program = new Program(IDL, provider);
    this.connection = this.program.provider.connection;
  }
  async bundleBuys(    creator,
    mint,
    createTokenMetadata,
    buyAmountSol,
    buyersWallets,
    slippageBasisPoints = 500n,
    priorityFees,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY,
    ){
      let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);
      let createTx = await this.getCreateInstructions(
        creator.publicKey,
        createTokenMetadata.name,
        createTokenMetadata.symbol,
        tokenMetadata.metadataUri,
        mint
      );
      let final_tx = new Transaction().add(createTx);
      const globalAccount = await this.getGlobalAccount(commitment);
      const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
      const buyAmountWithSlippage = calculateWithSlippageBuy(
        buyAmountSol,
        slippageBasisPoints
      );
      final_tx.add(
        await this.getBuyInstructions(
          creator.publicKey,
          mint.publicKey,
          globalAccount.feeRecipient,
          buyAmount,
          buyAmountWithSlippage
        )
      );

      for(let i=0; i<buyersWallets.length; i++){
        let buyTx = await this.getBuyInstructions(
          buyersWallets[i].publicKey,
          mint.publicKey,
          globalAccount.feeRecipient,
          buyAmount,
          buyAmountWithSlippage
        );
        final_tx.add(buyTx);
      }
      let createResults = await sendTx(
        this.connection,
        final_tx,
        creator.publicKey,
        [creator, mint,...buyersWallets],
        priorityFees,
        commitment,
        finality
      );
      return createResults;

    }
  async createAndBuy(
    creator,
    mint,
    createTokenMetadata,
    buyAmountSol,
    slippageBasisPoints = 500n,
    priorityFees,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ){
    let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);

    let createTx = await this.getCreateInstructions(
      creator.publicKey,
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );

    let newTx = new Transaction().add(createTx);

    if (buyAmountSol > 0) {
      const globalAccount = await this.getGlobalAccount(commitment);
      const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
      const buyAmountWithSlippage = calculateWithSlippageBuy(
        buyAmountSol,
        slippageBasisPoints
      );

      const buyTx = await this.getBuyInstructions(
        creator.publicKey,
        mint.publicKey,
        globalAccount.feeRecipient,
        buyAmount,
        buyAmountWithSlippage
      );

      newTx.add(buyTx);
    }
    // using jito
    const res = await sendTxToJito(
      this.connection,
      newTx,
      creator,
      [creator, mint],
      0.00003
    );
    // with jito
    // let createResults = await sendTx(
    //   this.connection,
    //   newTx,
    //   creator.publicKey,
    //   [creator, mint],
    //   priorityFees,
    //   commitment,
    //   finality
    // );

    return res.success;
  }

  async buy(
    buyer,
    mint,
    buyAmountSol,
    slippageBasisPoints = 500n,
    priorityFees,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ) {
    let buyTx = await this.getBuyInstructionsBySolAmount(
      buyer.publicKey,
      mint,
      buyAmountSol,
      slippageBasisPoints,
      commitment
    );

    // let buyResults = await sendTx(
    //   this.connection,
    //   buyTx,
    //   buyer.publicKey,
    //   [buyer],
    //   priorityFees,
    //   commitment,
    //   finality
    // );
    let buyResults = await sendTxToJito(
      this.connection,
      buyTx,
      buyer,
      [buyer],
      0.00001
    )
    return buyResults;
  }

  async sell(
    seller,
    mint,
    sellTokenAmount,
    slippageBasisPoints = 500n,
    priorityFees,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ) {
    let sellTx = await this.getSellInstructionsByTokenAmount(
      seller.publicKey,
      mint,
      sellTokenAmount,
      slippageBasisPoints,
      commitment
    );

    // let sellResults = await sendTx(
    //   this.connection,
    //   sellTx,
    //   seller.publicKey,
    //   [seller],
    //   priorityFees,
    //   commitment,
    //   finality
    // );
    let sellResults = await sendTxToJito(
      this.connection,
      sellTx,
      seller,
      [seller],
      0.00001
    )
    return sellResults;
  }

  //create token instructions
  async getCreateInstructions(
    creator,
    name,
    symbol,
    uri,
    mint
  ) {
    const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        mplTokenMetadata.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mplTokenMetadata
    );

    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint.publicKey,
      this.getBondingCurvePDA(mint.publicKey),
      true
    );
    
    return this.program.methods
      .create(name, symbol, uri)
      .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
      })
      .signers([mint])
      .transaction();
  }

  async getBuyInstructionsBySolAmount(
    buyer,
    mint,
    buyAmountSol,
    slippageBasisPoints = 500n,
    commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let buyAmount = bondingCurveAccount.getBuyPrice(buyAmountSol);
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    let globalAccount = await this.getGlobalAccount(commitment);

    return await this.getBuyInstructions(
      buyer,
      mint,
      globalAccount.feeRecipient,
      buyAmount,
      buyAmountWithSlippage
    );
  }
  async getAssoBondingCurve(
    mint,
  ){
      const associatedBondingCurve = await getAssociatedTokenAddress(
        mint,
        this.getBondingCurvePDA(mint),
        true
      );
      console.log(associatedBondingCurve)
      return associatedBondingCurve;
    }
  //buy
  async getBuyInstructions(
    buyer,
    mint,
    feeRecipient,
    amount,
    solAmount,
    commitment = DEFAULT_COMMITMENT
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, buyer, true);
    //const associatedUser = await getOrCreateAssociatedTokenAccount(this.connection, wallet, mint, buyer, false);

    let transaction = new Transaction();

    try {
      await getAccount(this.connection, associatedUser, commitment);
    } catch (e) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer,
          associatedUser,
          buyer,
          mint
        )
      );
    }

    transaction.add(
      await this.program.methods
        .buy(new BN(amount.toString()), new BN(solAmount.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: buyer,
        })
        .transaction()
    );

    return transaction;
  }

  //sell
  async getSellInstructionsByTokenAmount(
    seller,
    mint,
    sellTokenAmount,
    slippageBasisPoints = 500n,
    commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let globalAccount = await this.getGlobalAccount(commitment);

    let minSolOutput = bondingCurveAccount.getSellPrice(
      sellTokenAmount,
      globalAccount.feeBasisPoints
    );

    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );

    return await this.getSellInstructions(
      seller,
      mint,
      globalAccount.feeRecipient,
      sellTokenAmount,
      sellAmountWithSlippage
    );
  }

  async getSellInstructions(
    seller,
    mint,
    feeRecipient,
    amount,
    minSolOutput
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, seller, false);

    let transaction = new Transaction();

    transaction.add(
      await this.program.methods
        .sell(new BN(amount.toString()), new BN(minSolOutput.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: seller,
        })
        .transaction()
    );

    return transaction;
  }

  async getBondingCurveAccount(
    mint,
    commitment = DEFAULT_COMMITMENT
  ) {
    const tokenAccount = await this.connection.getAccountInfo(
      this.getBondingCurvePDA(mint),
      commitment
    );
    if (!tokenAccount) {
      return null;
    }
    return BondingCurveAccount.fromBuffer(tokenAccount.data);
  }

  async getGlobalAccount(commitment = DEFAULT_COMMITMENT) {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_ACCOUNT_SEED)],
      new PublicKey(PROGRAM_ID)
    );

    const tokenAccount = await this.connection.getAccountInfo(
      globalAccountPDA,
      commitment
    );

    return GlobalAccount.fromBuffer(tokenAccount.data);
  }

  getBondingCurvePDA(mint) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  async createTokenMetadata(create) {
    let formData = new FormData();
    
    // Handle file upload if provided
    if (create.file) {
      formData.append("file", create.file);
    }

    // Required fields
    formData.append("name", create.name);
    formData.append("symbol", create.symbol);
    formData.append("description", create.description || "");

    // Optional fields with defaults
    formData.append("twitter", create.twitter || "");
    formData.append("telegram", create.telegram || "");
    formData.append("website", create.website || "");
    formData.append("showName", "true");

    try {
      const request = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          // Let the FormData set its own Content-Type with boundary
        },
        body: formData,
      });

      if (!request.ok) {
        const errorText = await request.text();
        console.error('Failed metadata upload response:', errorText);
        throw new Error(`Failed to create token metadata: ${request.status} ${request.statusText}\n${errorText}`);
      }

      const contentType = request.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await request.text();
        console.error('Unexpected content type:', contentType);
        console.error('Response:', text);
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const response = await request.json();
      
      // Log the response for debugging
      console.log('Metadata upload response:', JSON.stringify(response, null, 2));

      if (!response.metadataUri) {
        throw new Error(`Invalid response from server: missing metadataUri\n${JSON.stringify(response, null, 2)}`);
      }

      return response;
    } catch (error) {
      console.error('Metadata creation error:', error);
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON response from server: ${error.message}`);
      }
      throw error;
    }
  }
  //EVENTS
  addEventListener(
    eventType,
    callback
  ) {
    return this.program.addEventListener(
      eventType,
      (event, slot, signature) => {
        let processedEvent;
        switch (eventType) {
          case "createEvent":
            processedEvent = toCreateEvent(event);
            callback(
              processedEvent,
              slot,
              signature
            );
            break;
          case "tradeEvent":
            processedEvent = toTradeEvent(event);
            callback(
              processedEvent,
              slot,
              signature
            );
            break;
          case "completeEvent":
            processedEvent = toCompleteEvent(event);
            callback(
              processedEvent ,
              slot,
              signature
            );
            console.log("completeEvent", event, slot, signature);
            break;
          case "setParamsEvent":
            processedEvent = toSetParamsEvent(event );
            callback(
              processedEvent,
              slot,
              signature
            );
            break;
          default:
            console.error("Unhandled event type:", eventType);
        }
      }
    );
  }

  removeEventListener(eventId) {
    this.program.removeEventListener(eventId);
  }
}

module.exports = { PumpFunSDK, PROGRAM_ID, GLOBAL_ACCOUNT_SEED, MINT_AUTHORITY_SEED, BONDING_CURVE_SEED, METADATA_SEED, DEFAULT_DECIMALS };