/**
 * Content Package & Delta Update Types
 *
 * Content packages are bundles of Learning Object versions optimized for:
 * - Bulk preloading onto devices (school labs, iPads)
 * - Efficient delta updates (only changed LOs)
 * - Morning connect windows for school deployment
 *
 * Package Lifecycle:
 * 1. School admin requests package for tenant/grades/subjects/date range
 * 2. Backend builds manifest with LO versions matching criteria
 * 3. Manifest + content URLs stored in S3
 * 4. Client downloads manifest, then content items with checksum validation
 * 5. Delta updates fetch only items changed since last sync
 */
export {};
//# sourceMappingURL=contentPackage.js.map