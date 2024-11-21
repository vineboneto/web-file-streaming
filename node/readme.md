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
