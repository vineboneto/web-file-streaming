import Excel from "exceljs";
import { fakerPT_BR as faker } from "@faker-js/faker";

const FILENAME = "great-size-file.xlsx";

const EXCEL_NUM_FMT = {
	CHAR: "@",
	FLOAT: "0.00",
	PERCENT: "0.00%",
	DATE: "dd/mm/yyyy",
};

const TOTAL = 1e6; // 1m

export async function generateExcelFile() {
	function setupSheet() {
		const workbook = new Excel.stream.xlsx.WorkbookWriter({
			filename: FILENAME,
			useSharedStrings: true,
			useStyles: true,
		});

		const sheet = workbook.addWorksheet("products", {
			views: [{ state: "frozen", ySplit: 1 }],
		});

		sheet.columns = [
			{
				alignment: {
					horizontal: "center",
				},
				header: "Code",
				key: "code",
				style: { numFmt: EXCEL_NUM_FMT.CHAR },
				width: 20,
			},
			{
				alignment: {
					horizontal: "fill",
				},
				header: "Name",
				key: "name",
				width: 30,
			},
			{
				alignment: {
					horizontal: "fill",
				},
				header: "Description",
				key: "description",
				width: 30,
			},
			{
				alignment: {
					horizontal: "right",
				},
				header: "Price",
				key: "price",
				width: 30,
				style: { numFmt: EXCEL_NUM_FMT.FLOAT },
			},
		];
		sheet.autoFilter = "A1:D1";

		return { sheet, workbook };
	}

	const { sheet, workbook } = setupSheet();

	for (let i = 0; i < TOTAL; i++) {
		sheet
			.addRow({
				code: faker.string.numeric({ length: 8 }),
				name: faker.commerce.productName(),
				description: faker.commerce.productDescription(),
				price: faker.number.float({ fractionDigits: 2 }),
			})
			.commit();
	}

	sheet.commit();
	await workbook.commit();
}
