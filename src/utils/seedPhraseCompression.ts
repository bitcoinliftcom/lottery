import { wordlist } from '@scure/bip39/wordlists/english';

export const compressSeedPhrase = (words: string[]): string => {
  // Each word in BIP39 is from a list of 2048 words
  // So each word can be represented by 11 bits (2^11 = 2048)
  // 12 words * 11 bits = 132 bits total
  
  let binary = '';
  
  // Convert each word to its index in the wordlist (11 bits each)
  words.forEach(word => {
    const index = wordlist.indexOf(word);
    const binaryIndex = index.toString(2).padStart(11, '0');
    binary += binaryIndex;
  });
  
  // Convert binary string to base36 (0-9, a-z)
  let value = BigInt('0b' + binary);
  let result = '';
  
  while (value > 0n) {
    const remainder = Number(value % 36n);
    // Use digits 0-9 for first 10 values, then a-z for remaining 26
    result = (remainder < 10 
      ? String(remainder) 
      : String.fromCharCode(87 + remainder)) + result; // 87 + 10 = 97 ('a')
    value = value / 36n;
  }
  
  // Pad to consistent length (base36 needs less chars than base26)
  return result.padStart(21, '0');
};

export const decompressSeedPhrase = (compressed: string): string[] => {
  // Convert base36 string back to binary
  let value = 0n;
  
  for (let i = 0; i < compressed.length; i++) {
    const char = compressed[i];
    // Convert char to value (0-9 or a-z)
    const charValue = BigInt(/[0-9]/.test(char) 
      ? parseInt(char) 
      : char.charCodeAt(0) - 87); // 'a' = 10, 'b' = 11, etc.
    value = value * 36n + charValue;
  }
  
  // Convert to binary string
  let binary = value.toString(2).padStart(132, '0');
  
  // Extract 11 bits for each word
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    const wordBits = binary.slice(i * 11, (i + 1) * 11);
    const index = parseInt(wordBits, 2);
    words.push(wordlist[index]);
  }
  
  return words;
}; 