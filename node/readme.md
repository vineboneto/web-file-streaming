# Large File Streaming Study

## Objective

This project aims to efficiently process and transfer large files (> 10MB) between the client and server using streams. The workflow of the application will be as follows:

1. **Server**: The server will read data from the database, generate an Excel file over 10MB, and send it to the client. The server should write the Excel file upon client request.
2. **Client**: The client should send the generated Excel file back to the server, which will process it and insert the data into the database.

## Concurrency

A concurrency test will be conducted with **5 simultaneous users** performing the same operation: sending and receiving the file.

## Architecture and Solutions

- **Processing Queue**: Using a processing queue, such as `async.queue`, may be necessary to manage the generation of the Excel file and ensure that the server is not overloaded. When generating the Excel file, it is crucial to avoid blocking the **Event Loop** in Node.js. This can be handled in different ways:

  1. **Queue with `async.queue`**: By using the queue, the Excel file generation is placed in an asynchronous task to avoid blocking the main event loop.
  2. **Using `Worker Threads` or `Fork`**: An alternative is to run the Excel file generation process outside the **Event Loop**, either by using `Worker Threads` or performing a `fork` to a separate process.

  - **`Worker Threads`**: Using `Worker Threads`, the file generation process runs in parallel, but shares memory with the main process. This can lead to higher memory consumption, as the `Worker Thread` keeps its own stack and shares some data with the main process.
  - **`Fork`**: When using a `fork`, the memory between the main process and the child process is isolated, which can help reduce memory usage in the main process. However, the CPU cost may increase because communication between processes is slower.

## Performance and Resource Consumption Considerations

- **`Worker Threads`**: The advantage is faster communication and shorter initialization time. However, increasing the number of simultaneous threads can lead to significant memory consumption, as each thread maintains its own stack and additional resources.
  
- **`Fork`**: Although creating isolated processes leads to higher memory overhead, the main process's memory consumption is reduced. The communication between processes is slower, which may impact performance, but memory isolation can be beneficial when dealing with many large files being processed.

## Concurrency Testing

The system should be tested with **5 simultaneous users** performing both sending and receiving operations. The solution must be capable of handling this load without blocking the Event Loop and ensuring data integrity.

## Tests Performed

The tests were performed using the `test.js` file. To replicate them, run the following commands:

```bash
# Executes a single request to write the file
node test.js writeFile 

# Executes 5 simultaneous requests to write files concurrently
node test.js writeFileParallel

# Downloads the created file and writes it to ./temp
node test.js streamFile
```

## Frontend Client

There is also a **frontend in React** that allows users to download and upload files via streaming. The client application uses the following methods:

- **Anchor Link**: Used to initiate the file download from the server. The download is triggered by using an anchor (`<a>`) element with the `href` attribute pointing to the file URL, allowing the user to download the file directly.

- **FileHandler**: Used to handle file uploads via streaming. The client sends the file to the server using the `FileHandler`, which uploads the file in small chunks, ensuring a more efficient transfer. This allows handling larger files without overwhelming the client or the server.

## Testing Client-Server Interaction

To test the interaction on the frontend, you can perform the following actions:

- **Download**: Trigger the download of a file from the React application using the anchor tag (`<a>`), which will initiate the download of the generated file.

- **Upload**: Upload a file from the frontend using the `FileHandler`, which will send the file to the server and insert it into the database.

## Receiving Files in Stream

### Notes 21/11

- The `@fastify-multipart` plugin does not allow fine-grained control over the file receiving and writing process. It seems that it requires the entire file to be fully received in memory before it can be written to disk, which is not ideal for large files.
- The desired behavior is:
  - Receive the data from the client in stream.
  - As chunks of data are received, write them directly to disk without fully storing them in memory.
  - Free up memory as the data is written, without needing to load the entire file before writing.

  However, it seems that `@fastify-multipart` does not offer this flexibility, as it requires the whole file to be received from the network before allowing you to write to disk.

- **Next steps**:
  - Create a `Dockerfile` to bring up the required services and configure Nginx to block file traffic larger than 10MB. This will help test the code in a controlled environment and check the traffic limits and whether the files are actually being sent in stream.
  - Test the file upload flow in Go to check if it's possible to better control the data flow and write directly to disk without loading the entire file into memory.
  - Investigate how Go handles file streams to avoid the same limitations that Fastify may have.

- **Additional observation**:
  - When creating an Excel file in stream, the file is only written after all the rows have been sent to the Excel file. This means the larger the spreadsheet, the greater the memory usage. This behavior can be problematic for large files. Test the same operation in Go to compare and check if there are differences in memory consumption when writing Excel files in stream.

### Notes 25/11

### Problem Description

- **Fastify:**
  - While attempting to implement file streaming from a client, the functionality was successfully implemented using Node.js's native `http`. However, this approach couldn't be directly replicated with `fastify`. To use `http` alongside `fastify`, the `serverFactory` property needs to be modified, which implies adjusting middlewares, cookie parsers, and other components that `fastify` automates. Once the request is handled by `http`, it doesn't reach `fastify`. This can be a time-consuming process.

  - Note: After some hours, it was discovered that it's possible to stream the data directly to the request, allowing for serialization and on-demand data processing. To implement this in `fastify`, it's necessary to add a custom `ContentTypeParser`, which resolves all the issues:

    ```javascript
    app.addContentTypeParser("*", (request, payload, done) => {
      done();
    });
    ```

- Based on the tests, this approach doesn't block the event loop, but it's important to find a more effective tool to test this.

- **Go:**
  - A similar problem was observed when trying to write `.xlsx` files on demand. In Go, when attempting to generate the file, it writes the content at the end instead of writing it while the file is being created, which is necessary for this use case.

- **Next Steps**
  1. **Test a direct browser request:** Check if the server accepts writing the file directly as expected.
  2. **Test with Axios:** Replicate the behavior using Axios to send the requests and check if the server handles the data flow as expected.
  3. **Verify Dockerfile and Go server activities:** Continue with the configurations already implemented in the Dockerfile and the Go server, maintaining consistency in the production environment.
