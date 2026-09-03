import Fastify from 'fastify';
import path from 'path';
import { loadConfigs, extractVector, TransactionPayload } from './normalization';
import { VectorEngine } from './vectorSearch';

const app = Fastify({ logger: false });
const engine = new VectorEngine();

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');

async function init() {
  loadConfigs(DATA_DIR);
  await engine.loadDataset(path.join(DATA_DIR, 'references.json.gz'));
}

app.get('/ready', async (req, reply) => {
  if (engine.ready()) {
    return reply.status(200).send({ status: 'ready' });
  }
  return reply.status(503).send({ status: 'loading' });
});

app.post<{ Body: TransactionPayload }>('/fraud-score', async (req, reply) => {
  if (!engine.ready()) {
    return reply.status(503).send({ error: 'engine not ready' });
  }

  const queryVector = extractVector(req.body);
  const fraudScore = engine.findFraudScore(queryVector);
  const approved = fraudScore < 0.6;

  return reply.status(200).send({
    approved,
    fraud_score: fraudScore,
  });
});

init().then(() => {
  app.listen({ port: 9999, host: '0.0.0.0' }, () => {
    console.log('Fraud Detection API listening on port 9999');
  });
});
