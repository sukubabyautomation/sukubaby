const express = require('express');

function createHttpServer(handler) {
  const app = express();
  const port = process.env.PORT || 8080;

  app.get('/', async (req, res) => {
    try {
      const result = await handler();
      res.status(200).send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error');
    }
  });

  return app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = {
  createHttpServer
};
