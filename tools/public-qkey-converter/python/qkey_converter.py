"""
QKey Public Converter v1.0 - Python Version
Official QKey format parser/generator for text, binary, JSON, CSV, XML
Includes native blockchain/crypto type support

Copyright (c) 2025 Farrel Wilson
License: GPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
"""

import json
import re
import csv
import io
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Union, Optional


class QKeyConverter:
    """Official QKey format converter with blockchain/crypto support"""
    
    @staticmethod
    def parse_text(qkey_text: str) -> Dict[str, Any]:
        """Parse QKey text to JSON/dict"""
        lines = qkey_text.split('\n')
        result = {'metadata': {}, 'schema': {}, 'records': []}
        current_record = {}
        record_name = ''
        
        for line in lines:
            line = line.strip()
            if line.startswith('//') or line == '':
                continue
                
            if ': {' in line:
                record_name = line.split(':')[0].strip()
                current_record = {}
            elif line == '}' and record_name:
                if current_record:
                    current_record['_id'] = record_name
                    result['records'].append(current_record)
                current_record = {}
                record_name = ''
            elif ':' in line and record_name:
                parts = line.split(':', 1)
                key = parts[0].strip()
                value = parts[1].strip().strip('"').strip(',')
                current_record[key] = value
                
        return result
    
    @staticmethod
    def stringify_text(json_obj: Dict[str, Any]) -> str:
        """Convert JSON/dict to QKey text"""
        text = ''
        
        # Metadata section
        if 'metadata' in json_obj and json_obj['metadata']:
            text += '@metadata: {\n'
            for k, v in json_obj['metadata'].items():
                text += f'  {k}: "{v}"\n'
            text += '}\n'
        
        # Schema section
        if 'schema' in json_obj and json_obj['schema']:
            text += 'schema: {\n'
            for k, v in json_obj['schema'].items():
                text += f'  {k}: "{v}"\n'
            text += '}\n'
        
        # Records section
        if 'records' in json_obj and json_obj['records']:
            for record in json_obj['records']:
                record_name = record.get('_id', 'record')
                text += f'{record_name}: {{\n'
                for k, v in record.items():
                    if k != '_id':
                        text += f'  {k}: "{v}"\n'
                text += '}\n'
        
        return text
    
    @staticmethod
    def parse_binary(qkb_buffer: bytes) -> Dict[str, Any]:
        """Parse QKB binary to JSON/dict (basic UTF-8 implementation)"""
        try:
            text = qkb_buffer.decode('utf-8')
            return QKeyConverter.parse_text(text)
        except:
            return {'metadata': {}, 'schema': {}, 'records': []}
    
    @staticmethod
    def stringify_binary(json_obj: Dict[str, Any]) -> bytes:
        """Convert JSON/dict to QKB binary (basic UTF-8 implementation)"""
        text = QKeyConverter.stringify_text(json_obj)
        return text.encode('utf-8')
    
    @staticmethod
    def parse_csv(csv_text: str) -> Dict[str, Any]:
        """Parse CSV to JSON/dict"""
        reader = csv.DictReader(io.StringIO(csv_text))
        records = []
        for row in reader:
            # Clean up the row data
            clean_row = {k.strip(): v.strip() if v else '' for k, v in row.items()}
            records.append(clean_row)
        return {'records': records}
    
    @staticmethod
    def stringify_csv(json_obj: Dict[str, Any]) -> str:
        """Convert JSON/dict to CSV"""
        if not json_obj.get('records'):
            return ''
        
        records = json_obj['records']
        if not records:
            return ''
        
        # Get headers (exclude _id)
        headers = [k for k in records[0].keys() if k != '_id']
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for record in records:
            row = {k: record.get(k, '') for k in headers}
            writer.writerow(row)
        
        return output.getvalue()
    
    @staticmethod
    def parse_xml(xml_text: str) -> Dict[str, Any]:
        """Parse XML to JSON/dict (basic implementation)"""
        try:
            root = ET.fromstring(xml_text)
            records = []
            
            for record_elem in root.findall('.//record'):
                record = {}
                for child in record_elem:
                    record[child.tag] = child.text or ''
                records.append(record)
            
            return {'records': records}
        except:
            return {'records': []}
    
    @staticmethod
    def stringify_xml(json_obj: Dict[str, Any]) -> str:
        """Convert JSON/dict to XML"""
        if not json_obj.get('records'):
            return '<records></records>'
        
        root = ET.Element('records')
        
        for record in json_obj['records']:
            record_elem = ET.SubElement(root, 'record')
            for k, v in record.items():
                if k != '_id':
                    child = ET.SubElement(record_elem, k)
                    child.text = str(v)
        
        return ET.tostring(root, encoding='unicode')
    
    # Blockchain/Crypto Utilities
    @staticmethod
    def validate_ethereum_address(address: str) -> bool:
        """Validate Ethereum address format (basic format check)."""
        if not isinstance(address, str):
            return False
        return bool(re.match(r'^0x[0-9a-fA-F]{40}$', address))
    
    @staticmethod
    def validate_bitcoin_address(address: str) -> bool:
        """Validate Bitcoin address format (legacy and Bech32)."""
        if not isinstance(address, str):
            return False
        # Legacy Base58 (very simplified length/range)
        if re.match(r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$', address):
            return True
        # Bech32 (bc1... or tb1...)
        if re.match(r'^(bc1|tb1)[ac-hj-np-z02-9]{11,71}$', address):
            return True
        return False
    
    @staticmethod
    def validate_signature(signature: str) -> bool:
        """Validate signature format (basic sanity check)."""
        return isinstance(signature, str) and len(signature.strip()) > 0
    
    @staticmethod
    def is_hex(text: str) -> bool:
        """Check if string is hexadecimal"""
        return bool(re.match(r'^[0-9a-fA-F]+$', text))
    
    @staticmethod
    def is_base64(text: str) -> bool:
        """Check if string is Base64"""
        import base64
        try:
            base64.b64decode(text, validate=True)
            return True
        except:
            return False
    
    @staticmethod
    def validate_tx_hash(tx_hash: str) -> bool:
        """Validate transaction hash format"""
        return bool(re.match(r'^0x[a-fA-F0-9]{64}$', tx_hash))
    
    @staticmethod
    def validate_nft_token_id(token_id: str) -> bool:
        """Validate NFT token ID format"""
        return token_id.isdigit() or QKeyConverter.is_hex(token_id)
    
    # Validation
    @staticmethod
    def validate_qkey_text(qkey_text: str) -> bool:
        """Validate QKey text format"""
        return isinstance(qkey_text, str) and ': {' in qkey_text
    
    @staticmethod
    def validate_qkb(qkb_buffer: bytes) -> bool:
        """Validate QKB binary format"""
        return isinstance(qkb_buffer, bytes) and len(qkb_buffer) > 0
    
    # --- Commercial Feature Notifications ---
    @staticmethod
    def use_advanced_compression() -> bool:
        """Alert about commercial feature: Advanced QKB compression"""
        print("Warning: Advanced QKB compression is a commercial feature. Using basic compression instead.")
        print("For commercial licensing options, contact sales@Querykey.com")
        return False
    
    @staticmethod
    def use_streaming_api() -> bool:
        """Alert about commercial feature: Streaming API"""
        print("Warning: Streaming API is a commercial feature not available in the open source edition.")
        print("For commercial licensing options, contact sales@Querykey.com")
        return False
    
    @staticmethod
    def use_enterprise_security_features() -> bool:
        """Alert about commercial feature: Enterprise security features"""
        print("Warning: Enterprise security features are not available in the open source edition.")
        print("For commercial licensing options, contact sales@Querykey.com")
        return False
    
    @staticmethod
    def use_high_performance_binary() -> bool:
        """Alert about commercial feature: High-performance binary format"""
        print("Warning: High-performance binary format is a commercial feature.")
        print("For commercial licensing options, contact sales@Querykey.com")
        return False


# Example usage
if __name__ == '__main__':
    # Test basic functionality
    qkey_text = """
user1: {
  name: "Alice"
  email: "alice@example.com"
  wallet: "0x1234567890123456789012345678901234567890"
}
"""
    
    print("=== QKey Python Converter Test ===")
    
    # Parse QKey text
    data = QKeyConverter.parse_text(qkey_text)
    print("Parsed data:", json.dumps(data, indent=2))
    
    # Generate QKey text
    generated = QKeyConverter.stringify_text(data)
    print("Generated QKey text:")
    print(generated)
    
    # Test blockchain validation
    eth_addr = "0x1234567890123456789012345678901234567890"
    print(f"Ethereum address valid: {QKeyConverter.validate_ethereum_address(eth_addr)}")
    
    print("=== Test Complete ===")
