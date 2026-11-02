# img-vercel

Projeto de captura de imagem com autorização explícita e envio ao Telegram, preparado para Vercel Functions. **A tela de chave de acesso foi removida.**

## Como funciona

- A página abre diretamente, sem login ou chave de acesso.
- A pessoa precisa marcar a confirmação de que quem está diante da câmera sabe da captura e concorda.
- Ao tocar em **Iniciar câmera**, o navegador solicita a permissão de câmera.
- A prévia da câmera fica visível durante o uso e há um botão **Parar**.
- A primeira foto é enviada após a câmera iniciar; depois, os envios seguem o intervalo escolhido (5, 10 ou 30 segundos).
- A captura para quando a pessoa toca em **Parar** ou fecha/sai da página.
- As imagens são processadas em memória e enviadas ao Telegram; o projeto não as salva permanentemente.

## Variáveis de ambiente na Vercel

Em **Project → Settings → Environment Variables**, configure somente:

- `BOT_TOKEN`: token do bot do Telegram.
- `CHAT_ID`: ID do chat ou grupo que receberá as fotos. O bot precisa poder enviar mensagens nesse destino.

Não coloque esses valores no HTML, no `script.js` ou no GitHub. O arquivo `.env` deve permanecer fora do repositório. Depois de alterar variáveis, faça um novo deploy.

## Publicar

1. Extraia o ZIP.
2. Envie os arquivos para o repositório GitHub conectado à Vercel, substituindo a versão anterior.
3. Na Vercel, confirme `BOT_TOKEN` e `CHAT_ID` em Environment Variables.
4. Faça um novo deploy.
5. Abra o endereço HTTPS e teste a câmera e o recebimento no Telegram.

## Teste local

Requer Node.js 22 ou superior e Vercel CLI:

```bash
npm install
vercel dev
```

## Atenção sobre acesso público

Sem chave ou login, qualquer pessoa que tiver o link poderá abrir a página e, se aceitar a permissão do navegador e marcar a confirmação, enviar imagens para o Telegram configurado. A verificação de origem ajuda contra alguns envios externos, mas **não substitui autenticação nem proteção contra abuso**. Não publique o link em locais públicos se não quiser receber envios de desconhecidos. Para uso público, configure autenticação ou limite de acesso e rate limiting persistente.

O navegador exige HTTPS (fornecido pela Vercel) ou `localhost` para acessar a câmera. A permissão do navegador não é removida nem contornada. Use o sistema somente com conhecimento e consentimento da pessoa fotografada. As imagens enviadas ficam sujeitas às políticas e configurações de retenção do Telegram.
