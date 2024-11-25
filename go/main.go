package main

import (
	"fmt"
	"log"
	"math/rand"
	"runtime"
	"time"

	"github.com/xuri/excelize/v2"
)

const FILENAME = "great-size-file.xlsx"

const TOTAL = 1048575 // LIMIT
// const TOTAL = 1 // LIMIT

// Struct to store formatted memory usage
type MemoryUsage struct {
	RSS       string
	HeapTotal string
	HeapUsed  string
	External  string
}

// Function to format memory usage
func formatMemoryUsage(memoryStats runtime.MemStats) MemoryUsage {
	return MemoryUsage{
		RSS:       fmt.Sprintf("%.2fMB", float64(memoryStats.Sys)/1024/1024),
		HeapTotal: fmt.Sprintf("%.2fMB", float64(memoryStats.HeapSys)/1024/1024),
		HeapUsed:  fmt.Sprintf("%.2fMB", float64(memoryStats.HeapAlloc)/1024/1024),
		External:  fmt.Sprintf("%.2fMB", float64(memoryStats.Mallocs)/1024/1024),
	}
}

// Function to generate a random product name
func randomProductName() string {
	return fmt.Sprintf("Product %d", rand.Intn(10000))
}

// Function to generate a random product description
func randomProductDescription() string {
	return fmt.Sprintf("Description of product %d", rand.Intn(10000))
}

// Function to generate a random price
func randomPrice() float64 {
	return float64(rand.Intn(1000)) + rand.Float64()
}

// Function to generate Excel file stream without overwriting
func generateExcelStream() error {
	// Create a new Excel file
	file := excelize.NewFile()

	// Create a new sheet and set headers
	sheetName := "products"
	file.NewSheet(sheetName)

	// Define columns
	headers := []string{"Code", "Name", "Description", "Price"}
	for colIndex, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+colIndex)))

		file.SetCellValue(sheetName, cell, header)
	}

	// Create a StreamWriter to write rows progressively
	stream, err := file.NewStreamWriter(sheetName)
	if err != nil {
		return fmt.Errorf("failed to create stream writer: %w", err)
	}

	styleID, err := file.NewStyle(&excelize.Style{Font: &excelize.Font{Color: "777777"}})
	if err != nil {
		fmt.Println(err)
		return nil
	}
	if err := stream.SetRow("A1",
		[]interface{}{
			excelize.Cell{StyleID: styleID, Value: "Code"},
			excelize.Cell{StyleID: styleID, Value: "Name"},
			excelize.Cell{StyleID: styleID, Value: "Description"},
			excelize.Cell{StyleID: styleID, Value: "Price"},
		}); err != nil {
		return nil
	}

	for i := 0; i < TOTAL; i++ {
		// 	// Generate data for each row
		code := fmt.Sprintf("%08d", rand.Intn(400))
		name := randomProductName()
		description := randomProductDescription()
		price := randomPrice()

		cell := fmt.Sprintf("%s%d", "A", i+2)

		if err := stream.SetRow(cell, []interface{}{
			excelize.Cell{StyleID: styleID, Value: code},
			excelize.Cell{StyleID: styleID, Value: name},
			excelize.Cell{StyleID: styleID, Value: description},
			excelize.Cell{StyleID: styleID, Value: price},
		}); err != nil {
			return fmt.Errorf("failed to set row: %w", err)
		}

		if (i+1)%1000 == 0 {
			fmt.Println("Delay")
			time.Sleep(1 * time.Second) // Atraso de 1 segundo
		}

	}

	// // Finally, flush any remaining data in the buffer
	if err := stream.Flush(); err != nil {
		fmt.Println("Flush")
		return fmt.Errorf("failed to flush final stream: %w", err)
	}

	if err := file.SaveAs(FILENAME); err != nil {
		fmt.Println(err)

		return err
	}

	return nil
}

// Function to monitor memory usage in a separate goroutine
func monitorMemoryUsage() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			var memStats runtime.MemStats
			runtime.ReadMemStats(&memStats)
			memoryUsage := formatMemoryUsage(memStats)
			fmt.Printf("Memory usage: %+v\n", memoryUsage)
		}
	}
}

func main() {
	// Initialize random seed
	rand.New(rand.NewSource(99))

	// Start memory usage monitor in a separate goroutine
	go monitorMemoryUsage()

	// Start generating the Excel file
	err := generateExcelStream()
	if err != nil {
		log.Fatalf("Failed to generate Excel file: %v", err)
	}

	fmt.Println("Excel file generated successfully")
}
