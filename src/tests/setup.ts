// IndexedDB n'existe pas dans Node : fake-indexeddb le fournit aux tests
// de la couche stockage. Les tests du domaine n'y touchent pas.
import 'fake-indexeddb/auto'
