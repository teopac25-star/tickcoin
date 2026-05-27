(async () => {
  const { ethers } = await import('ethers');

  const wallet = ethers.Wallet.createRandom({ path: "m/44'/0'/0'/0/0" });

  console.log('Bitcoin-inspired Wallet Generation');
  console.log('-----------------------------------');
  console.log('Derivation Path: m/44\'/0\'/0\'/0/0');
  console.log('Address:', wallet.address);
  console.log('Private Key:', wallet.privateKey);
  console.log('Mnemonic (BIP39):', wallet.mnemonic?.phrase);
  console.log('\nWARNING: Keep your private key and mnemonic secure. Do not share them.');
})();