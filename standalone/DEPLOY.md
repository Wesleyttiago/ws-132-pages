# Hospedagem independente do ChatGPT

Esta versão usa Node 24, SQLite e arquivos em disco. Não precisa de conta ChatGPT para visitantes, de Sites, D1, R2 ou senhas gravadas no código.

## Antes de publicar

1. Criar um repositório PRIVADO no GitHub e enviar o projeto.
2. Escolher um serviço capaz de executar Docker com HTTPS e volume persistente.
3. Montar um volume persistente em /data; ele guarda registros, sessões e fotos adicionadas.
4. Configurar AUTH_SUELAINE132_HASH com o hash da senha do acesso compartilhado suelaine132. O script hash-password.mjs lê cada senha por stdin; nunca inclua a senha nos argumentos do comando, no Git ou nas mensagens.
5. Configurar PORT conforme o serviço, mantendo NODE_ENV=production.
6. Publicar usando Dockerfile. Verificar /health e os dois acessos antes de compartilhar a URL.

Não publique a pasta web em GitHub Pages: o servidor protege também os arquivos das fotos. Uma página estática com um formulário de senha não oferece essa proteção.

## Compilar e executar

    node standalone/build.mjs
    node standalone-dist/server/runtime.mjs

As variáveis acima devem estar definidas no ambiente. Desenvolvimento local pode usar NODE_ENV=development; não use essa opção em produção.

O login compartilhado solicitado é suelaine132. A senha e seu hash devem ficar no ambiente privado da hospedagem; nunca no código ou no GitHub.

Os dados adicionados à primeira versão hospedada em Sites não são migrados automaticamente. É necessário exportá-los e migrá-los de forma controlada antes de uma troca definitiva. As 40 fotos originais e os valores iniciais estão nesta versão.

O GitHub guarda o código. O serviço externo executa a aplicação e protege fotos e dados com sessões verificadas no servidor.
