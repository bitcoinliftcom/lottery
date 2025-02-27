import { wordlist } from '@scure/bip39/wordlists/english';
import { validateMnemonic, entropyToMnemonic } from 'bip39';

export const compressSeedPhrase = (words: string[]): string => {
  // Validate the mnemonic first
  const mnemonic = words.join(' ');
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  // Add word count prefix (1 for 12, 2 for 18, 3 for 24)
  const prefix = words.length === 24 ? '3' 
    : words.length === 18 ? '2' 
    : '1';

  // Each word in BIP39 is from a list of 2048 words
  // So each word can be represented by 11 bits (2^11 = 2048)
  const bitsPerWord = 11;
//  const totalBits = words.length * bitsPerWord;
  
  let binary = '';
  
  // Convert each word to its index in the wordlist (11 bits each)
  words.forEach(word => {
    const index = wordlist.indexOf(word);
    const binaryIndex = index.toString(2).padStart(bitsPerWord, '0');
    binary += binaryIndex;
  });
  
  // Convert binary string to base36 (0-9, a-z)
  let value = BigInt('0b' + binary);
  let result = '';
  
  while (value > 0n) {
    const remainder = Number(value % 36n);
    result = (remainder < 10 
      ? String(remainder) 
      : String.fromCharCode(87 + remainder)) + result;
    value = value / 36n;
  }
  
  // Pad to consistent length based on word count
  const padLength = words.length === 24 ? 42 
    : words.length === 18 ? 32 
    : 21;
  
  // Add prefix to the padded result
  return prefix + result.padStart(padLength, '0');
};

export const decompressSeedPhrase = (compressed: string): string[] => {
  try {
    // Extract word count from prefix
    const prefix = compressed[0];
    const wordCount = prefix === '3' ? 24 
      : prefix === '2' ? 18 
      : 12;
    
    // Remove prefix for processing
    const compressedValue = compressed.slice(1);
    
    // Convert base36 string back to binary
    let value = 0n;
    
    // Handle leading zeros by using the full padded string
    for (const char of compressedValue) {
      const charValue = BigInt(/[0-9]/.test(char) 
        ? parseInt(char) 
        : char.charCodeAt(0) - 87);
      value = value * 36n + charValue;
    }
    
    // Convert to binary string with proper padding
    const bitsPerWord = 11;
    const totalBits = wordCount * bitsPerWord;
    const binary = value.toString(2).padStart(totalBits, '0');
    
    // Convert binary to hex for entropy
    const entropyBits = wordCount * 4/3 * 8; // Convert bytes to bits
    const entropyHex = binary.slice(0, entropyBits)
      .padStart(entropyBits, '0')
      .match(/.{1,8}/g)!
      .map(byte => parseInt(byte, 2).toString(16).padStart(2, '0'))
      .join('');

    // Generate mnemonic from entropy (this will add proper checksum)
    const mnemonic = entropyToMnemonic(entropyHex);
    return mnemonic.split(' ');

  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Invalid compressed seed phrase');
  }
}; 