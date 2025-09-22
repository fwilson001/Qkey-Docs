# QKey Public Converter Documentation

Welcome to the official documentation for the QKey Public Converter. This guide provides comprehensive information for developers working with the QKey format and converter tools.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [API Reference](#api-reference)
5. [Format Specifications](#format-specifications)
6. [Tutorials](#tutorials)
7. [Integration Guides](#integration-guides)
8. [Contributing](#contributing)
9. [License](#license)

## Introduction

QKey is a high-performance data format designed for efficient storage, transfer, and query of structured data. The QKey Public Converter is an open-source tool that allows developers to convert between QKey and other common data formats such as JSON, CSV, and XML.

Key Features

- Text and Binary Format Support: Convert between QKey text, QKB binary, and other formats
- Multi-Format Conversion: JSON, CSV, XML, and more
- Blockchain Data Support: Native validation for blockchain addresses and data
- Schema Handling: Automatic schema extraction and validation
- Lightweight: No external dependencies
- Cross-Platform: Works in Node.js, Python, and browsers

What's Included in the Open Source Edition

The open source edition under GPL-3.0 includes all basic functionality:

- Complete QKey text parsing and generation
- Basic QKB binary support
- Format conversion (JSON, CSV, XML)
- Blockchain data validation
- Standard query capabilities

For information about features available only in the commercial version, see the Commercial Features section below.

## Installation

JavaScript (download and include)

- Download qkeyConverter.js and place it in your project
  - Source path in this repository: company/public-qkey-converter/js/qkeyConverter.js
  - Or download from your preferred release/source mirror

Node.js usage (ES modules)

```javascript
// Import using a local path to the downloaded file
import QKeyConverter from './qkeyConverter.js';
```

Browser usage (ES modules)

```html
import QKeyConverter from './qkeyConverter.js';
<script type="module">
  import QKeyConverter from '/path/to/qkeyConverter.js';
  // use QKeyConverter here
  console.log('QKeyConverter loaded', typeof QKeyConverter);
  
</script>
```

Python (download and include)

- Download qkey_converter.py and place it alongside your code or on PYTHONPATH
  - Source path in this repository: company/public-qkey-converter/python/qkey_converter.py

```python
# Import the module by filename (no external dependencies)
from qkey_converter import QKeyConverter
```

## Basic Usage

JavaScript

```javascript
// Use a relative path to where you saved qkeyConverter.js (ESM)
import QKeyConverter from './qkeyConverter.js';

// Parse QKey text to JSON
const qkeyText = `
user1: {
  name: "Alice"
  email: "alice@example.com"
  wallet: "0x1234567890123456789012345678901234567890"
}
`;

const data = QKeyConverter.parseText(qkeyText);
console.log(data);
import QKeyConverter from './qkeyConverter.js';

// Convert JSON to QKey text
const jsonData = {
  metadata: { version: "1.0" },
  records: [
    { _id: "user2", name: "Bob", email: "bob@example.com" }
  ]
};

const newQKeyText = QKeyConverter.stringifyText(jsonData);
console.log(newQKeyText);
```

Python

```python
from qkey_converter import QKeyConverter
import QKeyConverter from './qkeyConverter.js';
# Parse QKey text to JSON
qkey_text = """
user1: {
  name: "Alice"
  email: "alice@example.com"
  wallet: "0x1234567890123456789012345678901234567890"
}
"""

data = QKeyConverter.parse_text(qkey_text)
print(data)
# Output: {'metadata': {}, 'schema': {}, 'records': [{'_id': 'user1', 'name': 'Alice', ...}]}

# Convert JSON to QKey text
json_data = {
  'metadata': {'version': '1.0'},
  'records': [
    {'_id': 'user2', 'name': 'Bob', 'email': 'bob@example.com'}
  ]
}

new_qkey_text = QKeyConverter.stringify_text(json_data)
print(new_qkey_text)
```

## API Reference

The following sections provide detailed API reference for both JavaScript and Python versions of the QKey Public Converter.

JavaScript API

Text Parsing and Generation

```javascript
// Parse QKey text to JSON
const data = QKeyConverter.parseText(qkeyText);

// Convert JSON to QKey text
const qkeyText = QKeyConverter.stringifyText(jsonData);
```

Binary Conversion

```javascript
// Parse QKB binary to JSON
const data = QKeyConverter.parseBinary(qkbBuffer);

// Convert JSON to QKB binary
const qkbBuffer = QKeyConverter.stringifyBinary(jsonData);
```

Multi-Format Support

```javascript
// Parse CSV to JSON
const data = QKeyConverter.parseCSV(csvText);

// Convert JSON to CSV
const csvText = QKeyConverter.stringifyCSV(jsonData);

// Parse XML to JSON
const data = QKeyConverter.parseXML(xmlText);

// Convert JSON to XML
const xmlText = QKeyConverter.stringifyXML(jsonData);
```

Blockchain Utilities

```javascript
// Validate Ethereum address
const isValid = QKeyConverter.validateEthereumAddress(address);

// Validate Bitcoin address
const isValid = QKeyConverter.validateBitcoinAddress(address);

// Validate transaction hash
const isValid = QKeyConverter.validateTxHash(hash);

// Validate NFT token ID
const isValid = QKeyConverter.validateNFTTokenId(tokenId);
```

Validation

```javascript
// Validate QKey text format
const isValid = QKeyConverter.validateQKeyText(qkeyText);

// Validate QKB binary format
const isValid = QKeyConverter.validateQKB(qkbBuffer);
```

Python API

Text Parsing and Generation

```python
# Parse QKey text to JSON
data = QKeyConverter.parse_text(qkey_text)

# Convert JSON to QKey text
qkey_text = QKeyConverter.stringify_text(json_data)
```

Binary Conversion

```python
# Parse QKB binary to JSON
data = QKeyConverter.parse_binary(qkb_buffer)

# Convert JSON to QKB binary
qkb_buffer = QKeyConverter.stringify_binary(json_data)
```

Multi-Format Support

```python
# Parse CSV to JSON
data = QKeyConverter.parse_csv(csv_text)

# Convert JSON to CSV
csv_text = QKeyConverter.stringify_csv(json_data)

# Parse XML to JSON
data = QKeyConverter.parse_xml(xml_text)

# Convert JSON to XML
xml_text = QKeyConverter.stringify_xml(json_data)
```

Blockchain Utilities

```python
# Validate Ethereum address
is_valid = QKeyConverter.validate_ethereum_address(address)

# Validate Bitcoin address
is_valid = QKeyConverter.validate_bitcoin_address(address)

# Validate transaction hash
is_valid = QKeyConverter.validate_tx_hash(hash)

# Validate NFT token ID
is_valid = QKeyConverter.validate_nft_token_id(token_id)
```

Validation

```python
# Validate QKey text format
is_valid = QKeyConverter.validate_qkey_text(qkey_text)

# Validate QKB binary format
is_valid = QKeyConverter.validate_qkb(qkb_buffer)
```

## Format Specifications

QKey Text Format

QKey text format is a human-readable format that resembles a simplified JSON structure. It consists of three main sections:

Metadata Section (Optional)

```text
@metadata: {
  version: "1.0"
  created: "2025-08-01T12:00:00Z"
  creator: "QueryKey"
}
```

Schema Section (Optional)

```text
schema: {
  user: "object"
  name: "string"
  email: "string"
}
```

Records Section

```text
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
```

QKB Binary Format

QKB is a binary representation of QKey data designed for efficient storage and retrieval. The open source version includes basic binary support, while the commercial version includes advanced compression algorithms.

Basic QKB structure:

1. **Header** (8 bytes): Magic number and version
2. **Metadata Block**: Format metadata
3. **Schema Block**: Schema definitions
4. **Data Blocks**: Record data

## Tutorials

Converting Between Formats

JSON to QKey

```javascript
// JavaScript
const jsonData = {
  metadata: { version: "1.0" },
  records: [
    { _id: "user1", name: "Alice", email: "alice@example.com" },
    { _id: "user2", name: "Bob", email: "bob@example.com" }
  ]
};

const qkeyText = QKeyConverter.stringifyText(jsonData);
```

```python
# Python
json_data = {
  'metadata': {'version': '1.0'},
  'records': [
    {'_id': 'user1', 'name': 'Alice', 'email': 'alice@example.com'},
    {'_id': 'user2', 'name': 'Bob', 'email': 'bob@example.com'}
  ]
}

qkey_text = QKeyConverter.stringify_text(json_data)
```

CSV to QKey

```javascript
// JavaScript
const csvText = `name,email
Alice,alice@example.com
Bob,bob@example.com`;

const jsonData = QKeyConverter.parseCSV(csvText);
const qkeyText = QKeyConverter.stringifyText(jsonData);
```

```python
# Python
csv_text = """name,email
Alice,alice@example.com
Bob,bob@example.com"""

json_data = QKeyConverter.parse_csv(csv_text)
qkey_text = QKeyConverter.stringify_text(json_data)
```

Working with Blockchain Data

```javascript
// JavaScript
const walletData = {
  metadata: { type: "wallets" },
  records: [
    { 
      _id: "wallet1", 
      address: "0x1234567890123456789012345678901234567890",
      balance: "1.5",
      transactions: ["0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"]
    }
  ]
};

// Validate wallet addresses
const wallet = walletData.records[0];
if (QKeyConverter.validateEthereumAddress(wallet.address)) {
  console.log("Valid Ethereum address");
}

// Convert to QKey text
const qkeyText = QKeyConverter.stringifyText(walletData);
```

## Integration Guides

Node.js Integration

```javascript
// Import from the local file you downloaded (ESM)
import QKeyConverter from './qkeyConverter.js';
import fs from 'fs';
const fs = require('fs');

// Read QKey file
const qkeyText = fs.readFileSync('data.qkey', 'utf8');
const data = QKeyConverter.parseText(qkeyText);

// Process data
// ...

// Save back to QKey
const newQkeyText = QKeyConverter.stringifyText(data);
fs.writeFileSync('updated.qkey', newQkeyText);
```

Python Integration

```python
from qkey_converter import QKeyConverter
import json

# Load data from JSON file
with open('data.json', 'r') as f:
    json_data = json.load(f)

# Convert to QKey
qkey_text = QKeyConverter.stringify_text(json_data)

# Save to file
with open('output.qkey', 'w') as f:
    f.write(qkey_text)
```

Web Browser Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>QKey Converter Demo</title>
</head>
<body>
    <textarea id="input" rows="10" cols="50">user1: {
  name: "Alice"
  email: "alice@example.com"
}</textarea>
    <button onclick="convert()">Convert</button>
    <pre id="output"></pre>
    
  <script type="module">
    import QKeyConverter from '/path/to/qkeyConverter.js';
        function convert() {
            const qkeyText = document.getElementById('input').value;
            try {
                const data = QKeyConverter.parseText(qkeyText);
        // Show QKey-compliant output
        document.getElementById('output').textContent = QKeyConverter.stringifyText(data);
            } catch (error) {
                document.getElementById('output').textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

## Commercial Features

The following features are only available in the commercial version of QKey:

1. **Advanced QKB Compression**: Proprietary compression algorithms achieving up to 96% compression ratios
2. **Streaming API**: Process large datasets without loading them entirely into memory
3. **Enterprise Security**: End-to-end encryption, advanced signature verification
4. **High-Performance Binary Format**: Specialized binary formats for maximum performance

For more information about commercial licensing, visit [https://QueryKey.com/pricing](https://QueryKey.com/pricing).

## Contributing

We welcome contributions to the QKey Public Converter. Please see CONTRIBUTING.md for guidelines.

## License

QKey Public Converter is released under the GNU General Public License v3.0 (GPL-3.0). See the LICENSE file for details.

---

© 2025 Farrel Wilson. QKeyDB are trademarks of Farrel Wilson.
