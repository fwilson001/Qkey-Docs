# QKey Public Converter v1.0 - Python Version

Official QKey format parser/generator for text, binary, JSON, CSV, XML with native blockchain/crypto type support.

## Installation

```bash
# No dependencies required - pure Python
pip install -r requirements.txt  # Optional, for development
```

## Quick Start

```python
from qkey_converter import QKeyConverter

# Parse QKey text
data = QKeyConverter.parse_text("""
user1: {
  name: "Alice"
  email: "alice@example.com"
  wallet: "0x1234567890123456789012345678901234567890"
}
""")

print(data)
# Output: {'metadata': {}, 'schema': {}, 'records': [{'_id': 'user1', 'name': 'Alice', 'email': 'alice@example.com', 'wallet': '0x...'}]}

# Generate QKey text
qkey_text = QKeyConverter.stringify_text(data)
print(qkey_text)
```

## API Reference

Text Parsing

- parse_text(qkey_text: str) -> Dict[str, Any] — Parse QKey text to dict
- stringify_text(json_obj: Dict[str, Any]) -> str — Convert dict to QKey text

Binary Conversion

- parse_binary(qkb_buffer: bytes) -> Dict[str, Any] — Parse QKB binary to dict
- stringify_binary(json_obj: Dict[str, Any]) -> bytes — Convert dict to QKB binary

Multi-Format Support

- parse_csv(csv_text: str) -> Dict[str, Any] — Parse CSV to dict
- stringify_csv(json_obj: Dict[str, Any]) -> str — Convert dict to CSV
- parse_xml(xml_text: str) -> Dict[str, Any] — Parse XML to dict
- stringify_xml(json_obj: Dict[str, Any]) -> str — Convert dict to XML

Blockchain Utilities

- validate_ethereum_address(address: str) -> bool — Validate Ethereum address
- validate_bitcoin_address(address: str) -> bool — Validate Bitcoin address
- validate_signature(signature: str) -> bool — Validate signature format
- validate_tx_hash(hash: str) -> bool — Validate transaction hash
- validate_nft_token_id(token_id: str) -> bool — Validate NFT token ID
- is_hex(str: str) -> bool — Check if string is hexadecimal
- is_base64(str: str) -> bool — Check if string is Base64

Validation

- validate_qkey_text(qkey_text: str) -> bool — Validate QKey text format
- validate_qkb(qkb_buffer: bytes) -> bool — Validate QKB binary format

## Examples

### Basic Data Conversion

```python
# CSV to QKey
csv_data = """name,email,wallet
Alice,alice@example.com,0x1234567890123456789012345678901234567890
Bob,bob@example.com,0x9876543210987654321098765432109876543210"""

json_data = QKeyConverter.parse_csv(csv_data)
qkey_text = QKeyConverter.stringify_text(json_data)
```

### Blockchain Integration

```python
# Validate crypto addresses
eth_address = "0x1234567890123456789012345678901234567890"
btc_address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"

if QKeyConverter.validate_ethereum_address(eth_address):
    print("Valid Ethereum address")

if QKeyConverter.validate_bitcoin_address(btc_address):
    print("Valid Bitcoin address")

# Validate transaction hash
tx_hash = "0x1234567890123456789012345678901234567890123456789012345678901234"
if QKeyConverter.validate_tx_hash(tx_hash):
    print("Valid transaction hash")
```

### Error Handling

```python
try:
    data = QKeyConverter.parse_text(qkey_text)
    # Process data
except Exception as error:
    print(f"Parse error: {error}")

# Validation before processing
if QKeyConverter.validate_qkey_text(qkey_text):
    data = QKeyConverter.parse_text(qkey_text)
else:
    print("Invalid QKey format")
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

QKeyDB and QKB are trademarks of Farrel Wilson.

This open source version does not include proprietary features such as:

- Advanced QKB compression algorithms
- Streaming API for large datasets
- Enterprise security features
- High-performance binary formats
