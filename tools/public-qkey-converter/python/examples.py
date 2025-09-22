"""
QKey Public Converter - Python Examples
Comprehensive examples for Python developers
"""

from qkey_converter import QKeyConverter
import json

def example_1_basic_parsing():
    """Example 1: Basic QKey Text Parsing"""
    print('=== Example 1: Basic QKey Text Parsing ===')
    
    qkey_text = """
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
"""

    parsed_data = QKeyConverter.parse_text(qkey_text)
    print('Parsed QKey data:', json.dumps(parsed_data, indent=2))

def example_2_json_to_qkey():
    """Example 2: JSON to QKey Text Generation"""
    print('\n=== Example 2: JSON to QKey Text ===')
    
    json_data = {
        'metadata': {'version': '1.0', 'creator': 'Developer'},
        'records': [
            {'_id': 'product1', 'name': 'Widget', 'price': '29.99', 'category': 'electronics'},
            {'_id': 'product2', 'name': 'Gadget', 'price': '49.99', 'category': 'tools'}
        ]
    }

    generated_qkey = QKeyConverter.stringify_text(json_data)
    print('Generated QKey text:')
    print(generated_qkey)

def example_3_csv_conversion():
    """Example 3: CSV Conversion"""
    print('\n=== Example 3: CSV Conversion ===')
    
    csv_data = """name,email,wallet,balance
Alice,alice@example.com,0x1234567890123456789012345678901234567890,1.5
Bob,bob@example.com,0x9876543210987654321098765432109876543210,2.3
Charlie,charlie@example.com,0xabcdef1234567890abcdef1234567890abcdef12,0.8"""

    csv_parsed = QKeyConverter.parse_csv(csv_data)
    print('CSV parsed to JSON:', json.dumps(csv_parsed, indent=2))

    csv_generated = QKeyConverter.stringify_csv(csv_parsed)
    print('JSON back to CSV:')
    print(csv_generated)

def example_4_xml_conversion():
    """Example 4: XML Conversion"""
    print('\n=== Example 4: XML Conversion ===')
    
    xml_data = """<records>
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
</records>"""

    xml_parsed = QKeyConverter.parse_xml(xml_data)
    print('XML parsed to JSON:', json.dumps(xml_parsed, indent=2))

    xml_generated = QKeyConverter.stringify_xml(xml_parsed)
    print('JSON back to XML:')
    print(xml_generated)

def example_5_binary_conversion():
    """Example 5: Binary Conversion"""
    print('\n=== Example 5: Binary Conversion ===')
    
    json_data = {
        'metadata': {'version': '1.0', 'creator': 'Developer'},
        'records': [
            {'_id': 'product1', 'name': 'Widget', 'price': '29.99'}
        ]
    }

    binary_data = QKeyConverter.stringify_binary(json_data)
    print('Binary size:', len(binary_data), 'bytes')

    binary_parsed = QKeyConverter.parse_binary(binary_data)
    print('Binary parsed back to JSON:', json.dumps(binary_parsed, indent=2))

def example_6_blockchain_validation():
    """Example 6: Blockchain Validation"""
    print('\n=== Example 6: Blockchain Validation ===')
    
    addresses = [
        "0x1234567890123456789012345678901234567890",  # Valid Ethereum
        "0x12345",  # Invalid Ethereum (too short)
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # Valid Bitcoin
        "invalid-address"  # Invalid
    ]

    for addr in addresses:
        print(f"Address: {addr}")
        print(f"  Ethereum: {QKeyConverter.validate_ethereum_address(addr)}")
        print(f"  Bitcoin: {QKeyConverter.validate_bitcoin_address(addr)}")

    # Transaction hash validation
    tx_hashes = [
        "0x1234567890123456789012345678901234567890123456789012345678901234",  # Valid
        "0x1234",  # Invalid (too short)
        "1234567890123456789012345678901234567890123456789012345678901234"  # Invalid (no 0x)
    ]

    for tx_hash in tx_hashes:
        print(f"TX Hash: {tx_hash} - Valid: {QKeyConverter.validate_tx_hash(tx_hash)}")

def example_7_error_handling():
    """Example 7: Error Handling"""
    print('\n=== Example 7: Error Handling ===')
    
    invalid_qkey = "invalid qkey format"

    # Safe parsing with validation
    if QKeyConverter.validate_qkey_text(invalid_qkey):
        data = QKeyConverter.parse_text(invalid_qkey)
        print('Parsed successfully:', data)
    else:
        print('Invalid QKey format detected')

    # Graceful error handling
    try:
        data = QKeyConverter.parse_text(invalid_qkey)
        print('Parsed:', data)
    except Exception as error:
        print('Parse error handled gracefully:', str(error))

def example_8_multi_format_pipeline():
    """Example 8: Multi-format Pipeline"""
    print('\n=== Example 8: Multi-format Pipeline ===')
    
    source_csv = """name,type,value
user,string,Alice
balance,number,1.5
wallet,address,0x1234567890123456789012345678901234567890"""

    print('Pipeline: CSV -> JSON -> QKey -> Binary -> JSON')
    
    step1 = QKeyConverter.parse_csv(source_csv)
    print('Step 1 (CSV->JSON):', json.dumps(step1, indent=2))

    step2 = QKeyConverter.stringify_text(step1)
    print('Step 2 (JSON->QKey):')
    print(step2)

    step3 = QKeyConverter.stringify_binary(step1)
    print('Step 3 (JSON->Binary): Buffer of', len(step3), 'bytes')

    step4 = QKeyConverter.parse_binary(step3)
    print('Step 4 (Binary->JSON):', json.dumps(step4, indent=2))

def main():
    """Run all examples"""
    print("QKey Python Converter - Examples")
    print("=" * 40)
    
    example_1_basic_parsing()
    example_2_json_to_qkey()
    example_3_csv_conversion()
    example_4_xml_conversion()
    example_5_binary_conversion()
    example_6_blockchain_validation()
    example_7_error_handling()
    example_8_multi_format_pipeline()
    
    print('\n=== All Examples Complete ===')

if __name__ == '__main__':
    main()
