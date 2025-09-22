# QKey Open Source vs Commercial Features

This document outlines the differences between the open source (GPL-3.0) and commercial versions of QKey.

## Open Source Features (GPL-3.0)

The open source version of QKey includes:

- Basic QKey text parsing/generation
- CSV/XML/JSON conversion
- Basic blockchain type validation
- Standard queries and operations
- Format validation
- Basic schema handling

## Proprietary Features (Commercial Only)

The following features have been stripped from the open source version and are only available under a commercial license:

Advanced QKB Compression Algorithms

The open source version includes basic compression, but the advanced proprietary algorithms that achieve up to 96% compression ratios are only available in the commercial version. This includes:

- Ultra-high compression ratio algorithms
- Domain-specific compression optimizations
- Performance-optimized binary packing
- Advanced dictionary compression

Streaming API for Large Datasets

The commercial version includes a high-performance streaming API for processing large datasets without loading them entirely into memory:

- Chunked processing capabilities
- Memory-efficient data handling
- Progress tracking and pause/resume functionality
- High-throughput pipeline processing

Enterprise Security Features

Advanced security features are only available in the commercial version:

- End-to-end encryption
- Advanced signature verification
- Hardware security module integration
- Compliance with enterprise security standards

High-Performance Binary Formats

Specialized binary formats for maximum performance are only in the commercial version:

- Optimized binary serialization
- Hardware-accelerated processing
- Advanced indexing for binary data
- Memory-mapped binary operations

## Implementation Details

How Features are Separated

The open source version has been carefully structured to:

1. Provide full functionality for basic QKey operations
2. Remove proprietary algorithms and implementations
3. Include appropriate license notices and documentation
4. Maintain API compatibility where possible

Fallback Behavior

When attempting to use commercial features in the open source version:

- Functions will return a message indicating the feature requires a commercial license
- No errors will be thrown that would break application flow
- Documentation clearly indicates which features are not available

## Upgrading to Commercial Version

Users who need the proprietary features can upgrade to a commercial license. Contact <sales@Querykey.com> for more information.
