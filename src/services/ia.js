const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';

const herramientas = [
  {
    name: 'crear_pedido',
    description: 'Registra un pedido. Úsala solo cuando el cliente confirmó el resumen y el total, y aceptó el tratamiento de sus datos.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        telefono: { type: 'string' },
        acepta_datos: { type: 'boolean', description: 'El cliente aceptó el tratamiento de datos personales' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id_producto: { type: 'integer' }, cantidad: { type: 'integer' } },
            required: ['id_producto', 'cantidad'],
          },
        },
      },
      required: ['nombre', 'telefono', 'acepta_datos', 'items'],
    },
  },
  {
    name: 'consultar_pedido',
    description: 'Consulta el estado de un pedido con su número y el teléfono del cliente.',
    input_schema: {
      type: 'object',
      properties: { id_pedido: { type: 'integer' }, telefono: { type: 'string' } },
      required: ['id_pedido', 'telefono'],
    },
  },
  {
    name: 'escalar_a_humano',
    description: 'Pasa la conversación a una persona cuando el cliente lo pide o no puedes resolver.',
    input_schema: { type: 'object', properties: {} },
  },
];

// Facade: el resto del sistema solo llama a responder()
async function responder({ system, historial, ejecutarHerramienta }) {
  const messages = [...historial];
  for (let i = 0; i < 5; i++) {
    const r = await client.messages.create({
      model: MODEL, max_tokens: 1000, system, tools: herramientas, messages,
    });
    if (r.stop_reason !== 'tool_use') {
      return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    }
    messages.push({ role: 'assistant', content: r.content });
    const resultados = [];
    for (const b of r.content.filter((x) => x.type === 'tool_use')) {
      let salida;
      try { salida = await ejecutarHerramienta(b.name, b.input); }
      catch (e) { salida = { error: e.message }; }
      resultados.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(salida) });
    }
    messages.push({ role: 'user', content: resultados });
  }
  return 'Disculpa, no pude completar la solicitud. Te comunico con una persona.';
}

module.exports = { responder };
