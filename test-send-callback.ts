// Тестовый скрипт для проверки отправки callback при подтверждении транзакции трейдером

async function testCallbackSending() {
  console.log("=== Тест отправки callback ===");
  
  // Создаем тестовый endpoint для приема callback'ов
  const testPort = 4444;
  
  // Запускаем тестовый сервер
  const server = Bun.serve({
    port: testPort,
    fetch(req) {
      const url = new URL(req.url);
      console.log(`[Test Server] Received ${req.method} request to ${url.pathname}`);
      console.log(`[Test Server] Headers:`, req.headers.toJSON());
      
      if (req.method === 'POST') {
        return req.json().then(body => {
          console.log(`[Test Server] Body:`, JSON.stringify(body, null, 2));
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      }
      
      return new Response('OK');
    },
  });
  
  console.log(`Test server listening on port ${testPort}`);
  console.log(`Callback URL will be: http://localhost:${testPort}/callback`);
  console.log(`Success URL will be: http://localhost:${testPort}/success`);
  console.log(`\nТеперь:`);
  console.log(`1. Создайте транзакцию с этими URL`);
  console.log(`2. Подтвердите её трейдером`);
  console.log(`3. Посмотрите, придут ли callback'и на этот сервер`);
  console.log(`\nНажмите Ctrl+C для остановки`);
}

testCallbackSending();
ENDFILE < /dev/null