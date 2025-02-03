import { pipeline } from '@xenova/transformers';

async function generateEmbeddings(text) {
    try {
        // Inicializar el pipeline de feature-extraction
        console.log('Cargando modelo...');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        // Generar embeddings
        console.log('Generando embeddings para:', text);
        const output = await extractor(text, {
            pooling: 'mean',
            normalize: true
        });

        // Convertir el tensor a Array
        const embeddings = Array.from(output.data);
        
        console.log('\nEmbeddings generados exitosamente:');
        console.log(`Dimensiones: ${embeddings.length}`);
        console.log('Primeros 5 valores:', embeddings.slice(0, 5));
        
        return embeddings;
    } catch (error) {
        console.error('Error al generar embeddings:', error);
        throw error;
    }
}

// Ejemplo de uso
const textoEjemplo = "Este es un ejemplo de texto para generar embeddings.";
generateEmbeddings(textoEjemplo);