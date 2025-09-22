/**
 * QKey Public Converter - Usage Examples (ESM)
 * Comprehensive examples for developers
 */

import QKeyConverter from './qkeyConverter.js';

// Example 1: Basic QKey Text Parsing
console.log('=== Example 1: Basic QKey Text Parsing ===');
const qkeyText = `
@metadata: {
  version: "1.0"
  created: "2025-08-01T12:00:00Z"
}

user1: {
  name: "Alice"
  email: "alice@example.com"
  wallet: "0x1234567890123456789012345678901234567890"
}

user2: {
  name: "Bob"
  email: "bob@example.com"
  wallet: "0x9876543210987654321098765432109876543210"
}
`;

const parsedData = QKeyConverter.parseText(qkeyText);
console.log('Parsed QKey records:', parsedData.records.length);
console.log('As QKey text (roundtrip):');
console.log(QKeyConverter.stringifyText(parsedData));

// Example 2: JSON to QKey Text Generation
console.log('\n=== Example 2: JSON to QKey Text ===');
const jsonData = {
  metadata: { version: "1.0", creator: "Developer" },
  records: [
    { _id: "product1", name: "Widget", price: "29.99", category: "electronics" },
    { _id: "product2", name: "Gadget", price: "49.99", category: "tools" }
  ]
};

const generatedQKey = QKeyConverter.stringifyText(jsonData);
console.log('Generated QKey text:');
console.log(generatedQKey);

// Example 3: CSV Conversion
console.log('\n=== Example 3: CSV Conversion ===');
const csvData = `name,email,wallet,balance
Alice,alice@example.com,0x1234567890123456789012345678901234567890,1.5
Bob,bob@example.com,0x9876543210987654321098765432109876543210,2.3
Charlie,charlie@example.com,0xabcdef1234567890abcdef1234567890abcdef12,0.8`;

const csvParsed = QKeyConverter.parseCSV(csvData);
console.log('CSV parsed - records:', csvParsed.records.length);

const csvGenerated = QKeyConverter.stringifyCSV(csvParsed);
console.log('JSON back to CSV:');
console.log(csvGenerated);

// Example 4: XML Conversion
console.log('\n=== Example 4: XML Conversion ===');
const xmlData = `<records>
  <record>
    <name>Alice</name>
    <email>alice@example.com</email>
    <wallet>0x1234567890123456789012345678901234567890</wallet>
  </record>
  <record>
    <name>Bob</name>
    <email>bob@example.com</email>
    <wallet>0x9876543210987654321098765432109876543210</wallet>
  </record>
</records>`;

const xmlParsed = QKeyConverter.parseXML(xmlData);
console.log('XML parsed - records:', xmlParsed.records.length);

const xmlGenerated = QKeyConverter.stringifyXML(xmlParsed);
console.log('JSON back to XML:');
console.log(xmlGenerated);

// Example 5: Binary Conversion
console.log('\n=== Example 5: Binary Conversion ===');
const binaryData = QKeyConverter.stringifyBinary(jsonData);
console.log('Binary size:', binaryData.length, 'bytes');

const binaryParsed = QKeyConverter.parseBinary(binaryData);
console.log('Binary parsed back - records:', binaryParsed.records.length);

// Example 6: Blockchain Validation
console.log('\n=== Example 6: Blockchain Validation ===');
const addresses = [
  "0x1234567890123456789012345678901234567890", // Valid Ethereum
  "0x12345", // Invalid Ethereum (too short)
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Valid Bitcoin
  "invalid-address" // Invalid
];

addresses.forEach(addr => {
  console.log(`Address: ${addr}`);
  console.log(`  Ethereum: ${QKeyConverter.validateEthereumAddress(addr)}`);
  console.log(`  Bitcoin: ${QKeyConverter.validateBitcoinAddress(addr)}`);
});

// Transaction hash validation
const txHashes = [
  "0x1234567890123456789012345678901234567890123456789012345678901234", // Valid
  "0x1234", // Invalid (too short)
  "1234567890123456789012345678901234567890123456789012345678901234" // Invalid (no 0x)
];

txHashes.forEach(hash => {
  console.log(`TX Hash: ${hash} - Valid: ${QKeyConverter.validateTxHash(hash)}`);
});

// Example 7: Error Handling
console.log('\n=== Example 7: Error Handling ===');
const invalidQKey = "invalid qkey format";

// Safe parsing with validation
if (QKeyConverter.validateQKeyText(invalidQKey)) {
  const data = QKeyConverter.parseText(invalidQKey);
  console.log('Parsed successfully:', data);
} else {
  console.log('Invalid QKey format detected');
}

// Graceful error handling
try {
  const data = QKeyConverter.parseText(invalidQKey);
  console.log('Parsed:', data);
} catch (error) {
  console.log('Parse error handled gracefully');
}

// Example 8: Multi-format Pipeline
console.log('\n=== Example 8: Multi-format Pipeline ===');
const sourceCSV = `name,type,value
user,string,Alice
balance,number,1.5
wallet,address,0x1234567890123456789012345678901234567890`;

console.log('Pipeline: CSV -> JSON -> QKey -> Binary -> JSON');
const step1 = QKeyConverter.parseCSV(sourceCSV);
console.log('Step 1 (CSV->JSON): records =', step1.records.length);

const step2 = QKeyConverter.stringifyText(step1);
console.log('Step 2 (JSON->QKey):\n', step2);

const step3 = QKeyConverter.stringifyBinary(step1);
console.log('Step 3 (JSON->Binary): Buffer of', step3.length, 'bytes');

const step4 = QKeyConverter.parseBinary(step3);
console.log('Step 4 (Binary->JSON): records =', step4.records.length);

console.log('\n=== All Examples Complete ===');
