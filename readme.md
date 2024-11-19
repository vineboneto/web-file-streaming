# Estudo de Stream de arquivos grandes

Objetivo: Fazer a stream de arquivo grande com `10mb` que é o que `nginx` aceita por padrão, pelo lado do cliente e do servidor. O aplicação deve fazer o seguinte roteiro:

- Ler do banco de dados, montar o excel e enviar uma arquivo com mais de 10mb para um cliente (o servidor deve escrever o arquivo mediante a solicitação).
- O cliente deve reenviar esse arquivo novamente para o servidor que deve inserir no banco.

Testar um caso de concorrência com 10 usuários realizando a mesma operação, tanto de enviar quanto receber.

É permitido utilizar filas se necessário.
