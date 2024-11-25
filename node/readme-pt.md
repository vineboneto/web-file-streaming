# Estudo de Stream de Arquivos Grandes

## Objetivo

Este projeto tem como objetivo realizar o processamento e transferência de arquivos grandes (> 10MB) de forma eficiente entre cliente e servidor, utilizando streams. O fluxo da aplicação será o seguinte:

1. **Servidor**: O servidor irá ler dados do banco de dados, montar um arquivo Excel com mais de 10MB e enviá-lo para o cliente. O servidor deverá escrever o arquivo Excel sob solicitação do cliente.
2. **Cliente**: O cliente deverá enviar o arquivo Excel gerado de volta para o servidor, que deverá processá-lo e inseri-lo no banco de dados.

## Concorrência

Será realizado um teste de concorrência com **5 usuários** simultâneos realizando a mesma operação: enviar e receber o arquivo.

## Estrutura e Soluções

- **Fila de Processamento**: A utilização de uma fila, como `async.queue`, pode ser necessária para gerenciar o processamento do arquivo Excel e garantir que o servidor não seja sobrecarregado. Ao gerar o arquivo Excel, é importante evitar bloquear o **Event Loop** do Node.js, o que pode ser feito de diferentes formas:
  
  1. **Fila com `async.queue`**: Ao utilizar a fila, a geração do arquivo Excel é colocada em uma tarefa assíncrona para não bloquear o evento principal.
  2. **Usando `Worker Threads` ou `Fork`**: Uma alternativa é executar o processo de geração do arquivo Excel fora do **Event Loop**, seja utilizando `Worker Threads` ou realizando um `fork` para um processo separado.
  
  - **`Worker Threads`**: Utilizando `Worker Threads`, o processo de geração do arquivo acontece em paralelo, mas compartilha memória com o processo principal. Isso pode resultar em um consumo de memória maior, pois o `Worker Thread` mantém a memória isolada, mas compartilha também alguns dados com o processo principal.
  - **`Fork`**: Quando se utiliza um `fork`, a memória entre o processo principal e o processo filho é isolada, o que pode ajudar a reduzir o consumo de memória no processo principal. No entanto, o custo de CPU pode ser maior, pois a comunicação entre os processos é mais lenta.

## Considerações sobre Desempenho e Consumo de Recursos

- **`Worker Threads`**: A vantagem é que a comunicação é mais rápida e o tempo de inicialização é menor. Contudo, o aumento de threads simultâneas pode consumir muita memória, já que cada thread mantém sua própria pilha e recursos adicionais.
  
- **`Fork`**: Embora a sobrecarga de memória seja maior ao criar processos isolados, o consumo de memória no processo principal é reduzido. A comunicação entre os processos é mais lenta, o que pode impactar a performance, mas o isolamento de memória pode ser vantajoso quando muitos arquivos grandes estão sendo processados.

## Testes de Concorrência

O sistema deverá ser testado com **5 usuários simultâneos** realizando tanto o envio quanto o recebimento do arquivo. A solução deverá ser capaz de lidar com essa carga sem travar o Event Loop e garantindo a integridade dos dados.

## Testes Realizados

Os testes foram realizados com o arquivo `test.js`. Para replicá-los, execute os seguintes comandos:

```bash
# Executa uma única requisição para escrever o arquivo
node test.js writeFile 

# Executa 5 requisições simultâneas para escrever arquivos de forma concorrente
node test.js writeFileParallel

# Realiza o download do arquivo criado e grava em ./temp
node test.js streamFile
```

## Frontend Cliente

Também existe um frontend em React que permite aos usuários fazer o download e enviar arquivos em formato de streaming. A aplicação cliente usa os seguintes métodos:

- **Link Anchor**: Para iniciar o download do arquivo do servidor. O download é disparado utilizando um elemento anchor (`<a>`) com o atributo `href` apontando para a URL do arquivo, permitindo que o usuário faça o download diretamente.

- **FileHandler**: Usado para lidar com o upload de arquivos via streaming. O cliente envia o arquivo para o servidor utilizando o `FileHandler`, que faz o envio dos dados do arquivo em pequenos pedaços, garantindo uma transferência mais eficiente. Isso permite lidar com arquivos maiores sem sobrecarregar o cliente ou o servidor.

## Testando a Interação Cliente-Servidor

Para testar a interação no frontend, você pode realizar as seguintes ações:

- **Download**: Disparar o download de um arquivo a partir da aplicação React utilizando a tag anchor (`<a>`), que iniciará o download do arquivo gerado.

- **Upload**: Enviar um arquivo do frontend utilizando o `FileHandler`, que fará o upload do arquivo para o servidor e o inserirá no banco de dados.

## Receber Arquivos em Stream

### Anotações 21/11

- O plugin `@fastify-multipart` não permite um controle fino sobre o fluxo de recebimento e escrita de arquivos. Parece que ele exige que o arquivo seja totalmente recebido na memória antes de poder ser escrito no disco, o que não é ideal para arquivos grandes.
- O comportamento desejado é:
  - Receber os dados do cliente em stream.
  - À medida que os chunks de dados são recebidos, escrever diretamente no disco sem armazená-los completamente na memória.
  - Liberar a memória conforme os dados são escritos, sem precisar carregar o arquivo inteiro antes da escrita.
  
  No entanto, parece que o `@fastify-multipart` não oferece essa flexibilidade, pois ele precisa receber o arquivo inteiro da rede antes de permitir que você escreva em disco.

- **Próximos passos**:
  - Criar um `Dockerfile` para subir os serviços necessários e configurar o Nginx para bloquear o tráfego de arquivos maiores que 10MB. Isso ajudará a testar o código em um ambiente controlado e verificar as limitações de tráfego e se os arquivos realmente estão sendo enviados em stream.
  - Testar o fluxo de upload de arquivos em Go para verificar se é possível controlar melhor o fluxo de dados e escrever diretamente no disco sem carregar o arquivo inteiro na memória.
  - Investigar como Go lida com streams de arquivos para evitar os mesmos limites que o Fastify pode ter.
  
- **Observação adicional**:
  - Ao criar um arquivo Excel em stream, o arquivo só é escrito após todas as linhas forem enviadas para o excel. Isso significa que quanto maior a planilha, maior será a utilização de memória utilizada. Esse comportamento pode ser problemático para grandes arquivos. Testar a mesma operação em Go para comparar e verificar se há diferenças no consumo de memória ao escrever arquivos Excel em stream.

### Anotações 25/11

- **Fastify:**
  - Ao tentar realizar o streaming de arquivos de um cliente, foi possível implementar a funcionalidade usando o `http` nativo do Node.js. No entanto, não conseguiu-se replicar essa abordagem diretamente com o `fastify`. Para acessar `http` em conjunto com `fastify` é necessário alterar a propriedade `serverFactory` diretamente e isso implica em  ajustar middlewares, parsers de cookies, entre outros componentes que o `fastify` automatiza, pois uma vez que a request é tratada pelo `http` ela não chega ao `fastify`. Isso pode ser um processo trabalhoso.

  - Obs: Após algumas horas, foi descoberto que é possível canalizar o fluxo para a própria requisição, permitindo lidar com a serialização e o processamento dos dados sob demanda. Para implementar isso no `fastify`, é necessário adicionar um `ContentTypeParser` personalizado, e isso resolve todos os problemas:

    ```javascript
    app.addContentTypeParser("*", (request, payload, done) => {
      done();
    });
    ```

  - Pelo o que foi testado, essa abordagem não trava o event-loop, mas é importante achar uma ferramenta mais eficaz para testar isso

- **Go:**
  - Um problema semelhante foi observado ao tentar escrever arquivos `.xlsx` de maneira sob demanda. No Go, ao tentar gerar o arquivo, ele só escreve o conteúdo no final, ao invés de escrever enquanto o arquivo está sendo criado, o que é necessário para este caso de uso.

- **Próximos Passos**
  1. **Testar uma requisição direta do navegador:** Verificar se o servidor aceita a escrita do arquivo diretamente, como esperado.
  2. **Testar com Axios:** Reproduzir o comportamento usando Axios para enviar as requisições e verificar se o servidor lida com o fluxo de dados como esperado.
  3. **Verificar atividades do Dockerfile e servidor Go:** Continuar com as configurações já implementadas no Dockerfile e no servidor Go, mantendo a consistência do ambiente de produção.
