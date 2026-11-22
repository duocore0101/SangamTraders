import * as XLSX from 'xlsx';

export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    throw new Error('No data available to export');
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function downloadSampleProductTemplate() {
  const sampleProducts = [
    {
      'Product Name': 'TMT Steel Rebars 12mm Fe-550D',
      'SKU': 'TMT-12MM-550',
      'Category': 'Building Materials',
      'Brand': 'Tata Tiscon',
      'Purchase Price': 62,
      'Selling Price': 74,
      'GST Rate': 18,
      'Unit': 'kg',
      'Current Stock': 1500,
      'Min Stock Level': 300,
      'Barcode': '890123400101',
      'Description': 'High strength earthquake-resistant reinforcement bars',
    },
    {
      'Product Name': 'Asian Paints Royale Luxury Matt 20L',
      'SKU': 'AP-ROY-20L',
      'Category': 'Paints & Finishes',
      'Brand': 'Asian Paints',
      'Purchase Price': 6800,
      'Selling Price': 8200,
      'GST Rate': 18,
      'Unit': 'box',
      'Current Stock': 35,
      'Min Stock Level': 5,
      'Barcode': '890123400102',
      'Description': 'Interior luxury architectural wall emulsion paint',
    },
    {
      'Product Name': 'Finolex PVC Heavy Duty Pipe 4 Inch 10ft',
      'SKU': 'FIN-PVC-4IN-10',
      'Category': 'Plumbing & Sanitary',
      'Brand': 'Finolex',
      'Purchase Price': 480,
      'Selling Price': 620,
      'GST Rate': 18,
      'Unit': 'mtr',
      'Current Stock': 120,
      'Min Stock Level': 25,
      'Barcode': '890123400103',
      'Description': 'Class 3 drainage and sanitary pressure pipe',
    },
    {
      'Product Name': 'Godrej Duralock Brass Padlock 70mm',
      'SKU': 'GOD-DUR-70MM',
      'Category': 'Hardware & Fasteners',
      'Brand': 'Godrej',
      'Purchase Price': 420,
      'Selling Price': 560,
      'GST Rate': 18,
      'Unit': 'pc',
      'Current Stock': 50,
      'Min Stock Level': 10,
      'Barcode': '890123400104',
      'Description': 'Solid brass rust-proof security locking cylinder with 3 keys',
    },
    {
      'Product Name': 'Havells 2.5 Sq mm Copper House Wire 90m',
      'SKU': 'HAV-WIRE-2.5',
      'Category': 'Electrical & Lighting',
      'Brand': 'Havells',
      'Purchase Price': 1850,
      'Selling Price': 2250,
      'GST Rate': 18,
      'Unit': 'roll',
      'Current Stock': 40,
      'Min Stock Level': 8,
      'Barcode': '890123400105',
      'Description': 'Flame retardant industrial/home electrical cable',
    },
  ];

  exportToExcel(sampleProducts, 'SangamSales_Product_Import_Template', 'Products');
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file does not contain any sheets');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  return jsonData;
}
