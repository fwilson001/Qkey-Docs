/*
 QKey Public Converter v1.0
 Official QKey format parser/generator for text, binary, JSON, CSV, XML
 Includes native blockchain/crypto type support
 No streaming API, no proprietary compression

 (c) 2025 Farrel Wilson — GPL-3.0-only
*/

export default class QKeyConverter {
    // --- QKey Text <-> JSON ---
    static parseText(qkeyText) {
        // Simple QKey text to JSON parser (similar to QKeyParser.simpleParse)
        const lines = qkeyText.split('\n');
        const result = { metadata: {}, schema: {}, records: [] };
        let currentRecord = {};
        let recordName = '';
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('//') || line === '') continue;
            if (line.includes(': {')) {
                recordName = line.split(':')[0].trim();
                currentRecord = {};
            } else if (line === '}' && recordName) {
                if (Object.keys(currentRecord).length > 0) {
                    result.records.push({ ...currentRecord, _id: recordName });
                }
                currentRecord = {};
                recordName = '';
            } else if (line.includes(':') && recordName) {
                const [key, ...valueParts] = line.split(':');
                let value = valueParts.join(':').trim();
                value = value.replace(/[",]/g, '').trim();
                currentRecord[key.trim()] = value;
            }
        }
        return result;
    }
    static stringifyText(jsonObj) {
        // JSON to QKey text generator
        let text = '';
        if (jsonObj.metadata && Object.keys(jsonObj.metadata).length > 0) {
            text += `@metadata: {\n`;
            for (const [k, v] of Object.entries(jsonObj.metadata)) {
                text += `  ${k}: "${v}"\n`;
            }
            text += `}\n`;
        }
        if (jsonObj.schema && Object.keys(jsonObj.schema).length > 0) {
            text += `schema: {\n`;
            for (const [k, v] of Object.entries(jsonObj.schema)) {
                text += `  ${k}: "${v}"\n`;
            }
            text += `}\n`;
        }
        if (jsonObj.records) {
            for (const rec of jsonObj.records) {
                const recName = rec._id || 'record';
                text += `${recName}: {\n`;
                for (const [k, v] of Object.entries(rec)) {
                    if (k === '_id') continue;
                    text += `  ${k}: "${v}"\n`;
                }
                text += `}\n`;
            }
        }
        return text;
    }

    // --- QKB Binary <-> JSON ---
    static parseBinary(input) {
        // Accept Buffer | Uint8Array | ArrayBuffer | string (UTF-8 encoded QKey text)
        try {
            let text = '';
            const hasBuffer = (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function' && typeof Buffer.isBuffer === 'function');
            if (hasBuffer && Buffer.isBuffer(input)) {
                text = input.toString('utf8');
            } else if (typeof input === 'string') {
                text = input;
            } else if (typeof TextDecoder !== 'undefined' && (input instanceof Uint8Array || input instanceof ArrayBuffer)) {
                const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
                text = new TextDecoder('utf-8').decode(u8);
            } else {
                return { metadata: {}, schema: {}, records: [] };
            }
            return QKeyConverter.parseText(text);
        } catch (_) {
            return { metadata: {}, schema: {}, records: [] };
        }
    }
    static stringifyBinary(jsonObj) {
        // Return Buffer in Node, Uint8Array in browser
        const text = QKeyConverter.stringifyText(jsonObj);
        const hasBuffer = (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function');
        if (hasBuffer) return Buffer.from(text, 'utf8');
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
        // Final fallback: return plain string (caller should handle)
        return text;
    }

    // --- CSV <-> QKey/JSON ---
    static parseCSV(csvText) {
        // CSV with basic RFC4180 handling: quotes, commas, newlines inside quotes
        const lines = csvText.replace(/\r\n?/g, '\n').split('\n');
        if (lines.length === 0) return { records: [] };
        const parseLine = (line) => {
            const out = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                    else inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                    out.push(cur);
                    cur = '';
                } else {
                    cur += ch;
                }
            }
            out.push(cur);
            return out.map(s => s.trim());
        };
        // Accumulate possibly multi-line quoted records
        const rows = [];
        let buffer = '';
        let quoteCount = 0;
        for (const raw of lines) {
            const line = buffer ? (buffer + '\n' + raw) : raw;
            const qc = (line.match(/"/g) || []).length;
            quoteCount += qc;
            if (quoteCount % 2 === 0) {
                rows.push(line);
                buffer = '';
                quoteCount = 0;
            } else {
                buffer = line;
            }
        }
        if (buffer) rows.push(buffer);
        if (rows.length === 0) return { records: [] };
        const headers = parseLine(rows[0]);
        const records = rows.slice(1).filter(r => r.trim() !== '').map(row => {
            const values = parseLine(row);
            const rec = {};
            headers.forEach((h, i) => rec[h] = (values[i] ?? '').trim());
            return rec;
        });
        return { records };
    }
    static stringifyCSV(jsonObj) {
        // JSON/QKey to CSV generator with quoting when needed
        if (!jsonObj.records || jsonObj.records.length === 0) return '';
        const headers = Object.keys(jsonObj.records[0]).filter(k => k !== '_id');
        const esc = (v) => {
            const s = (v == null ? '' : String(v));
            if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        let csv = headers.join(',') + '\n';
        for (const rec of jsonObj.records) {
            csv += headers.map(h => esc(rec[h])).join(',') + '\n';
        }
        return csv;
    }

    // --- XML <-> QKey/JSON ---
    static parseXML(xmlText) {
        // Prefer DOM parsing in browsers; fallback to simple tag parsing
        try {
            if (typeof DOMParser !== 'undefined') {
                const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
                const recNodes = doc.getElementsByTagName('record');
                const records = [];
                for (let i = 0; i < recNodes.length; i++) {
                    const rec = {};
                    const children = recNodes[i].children;
                    for (let j = 0; j < children.length; j++) {
                        rec[children[j].tagName] = (children[j].textContent || '').trim();
                    }
                    records.push(rec);
                }
                return { records };
            }
        } catch (_) { /* fall through */ }
        // Fallback: basic tag parsing
        const records = [];
        const recRegex = /<record>([\s\S]*?)<\/record>/g;
        let match;
        while ((match = recRegex.exec(xmlText)) !== null) {
            const rec = {};
            const fieldRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(match[1])) !== null) {
                rec[fieldMatch[1]] = fieldMatch[2].trim();
            }
            records.push(rec);
        }
        return { records };
    }
    static stringifyXML(jsonObj) {
        // JSON/QKey to XML generator
        if (!jsonObj.records || jsonObj.records.length === 0) return '<records></records>';
        let xml = '<records>\n';
        for (const rec of jsonObj.records) {
            xml += '  <record>\n';
            for (const [k, v] of Object.entries(rec)) {
                if (k === '_id') continue;
                xml += `    <${k}>${v}</${k}>\n`;
            }
            xml += '  </record>\n';
        }
        xml += '</records>';
        return xml;
    }

    // --- Blockchain/Crypto Types ---
    static validateEthereumAddress(address) {
        // Basic Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    static validateBitcoinAddress(address) {
        // Legacy Base58 (simplified) or Bech32 (bc1/tb1)
        if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
        if (/^(bc1|tb1)[ac-hj-np-z02-9]{11,71}$/.test(address)) return true;
        return false;
    }
    static validateSignature(signature) {
        // Basic signature format validation (trimmed)
        return typeof signature === 'string' && signature.trim().length > 0;
    }
    static isHex(str) {
        return /^[0-9a-fA-F]+$/.test(str);
    }
    static isBase64(str) {
        return /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(str);
    }
    static validateTxHash(hash) {
        // Ethereum tx hash: 0x + 64 hex chars
        return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }
    static validateNFTTokenId(tokenId) {
        // NFT token id: numeric or hex
        return /^[0-9]+$/.test(tokenId) || QKeyConverter.isHex(tokenId);
    }

    // --- Commercial Feature Notifications ---
    static useAdvancedCompression() {
        console.warn("Advanced QKB compression is a commercial feature. Using basic compression instead.");
        console.info("For commercial licensing options, contact sales@Querykey.com");
        return false;
    }
    
    static useStreamingAPI() {
        console.warn("Streaming API is a commercial feature not available in the open source edition.");
        console.info("For commercial licensing options, contact sales@Querykey.com");
        return false;
    }
    
    static useEnterpriseSecurityFeatures() {
        console.warn("Enterprise security features are not available in the open source edition.");
        console.info("For commercial licensing options, contact sales@Querykey.com");
        return false;
    }
    
    static useHighPerformanceBinary() {
        console.warn("High-performance binary format is a commercial feature.");
        console.info("For commercial licensing options, contact sales@Querykey.com");
        return false;
    }

    // --- Validation ---
    static validateQKeyText(qkeyText) {
        // Basic QKey text format validation
        return typeof qkeyText === 'string' && qkeyText.includes(': {');
    }
    static validateQKB(qkbBuffer) {
        // Accept Buffer | Uint8Array | ArrayBuffer
        if (typeof qkbBuffer === 'undefined' || qkbBuffer === null) return false;
        const isArrayBuffer = (qkbBuffer instanceof ArrayBuffer);
        const isUint8 = (typeof Uint8Array !== 'undefined' && qkbBuffer instanceof Uint8Array);
        const isBuffer = (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function' && Buffer.isBuffer(qkbBuffer));
        if (isArrayBuffer) return (qkbBuffer.byteLength || 0) > 0;
        if (isUint8) return qkbBuffer.length > 0;
        if (isBuffer) return qkbBuffer.length > 0;
        return false;
    }
}
