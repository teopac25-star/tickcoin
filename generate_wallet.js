const { ethers } = require('ethers');

const wallet = ethers.Wallet.createRandom();

console.log('Generated Wallet:');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('\nWARNING: Keep the private key and mnemonic secure. Do not share them.');
console.log('Email noted: teopac25@gmail.com');