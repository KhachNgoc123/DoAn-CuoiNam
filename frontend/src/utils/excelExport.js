export function escapeExcelHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeFilename(filename) {
  if (!filename) return `bao-cao-${new Date().toISOString().slice(0, 10)}.xls`
  return filename.endsWith('.xls') ? filename : filename.replace(/\.[^.]+$/, '') + '.xls'
}

function maxColumnCount(rows, fallback = 8) {
  return Math.max(fallback, ...rows.map((row) => row.length || 1))
}

function renderRows(rows, columnCount) {
  let nextRowIsHeader = false

  return rows
    .map((row) => {
      if (!row.length) {
        nextRowIsHeader = false
        return `<tr class="blank"><td colspan="${columnCount}"></td></tr>`
      }

      if (row.length === 1) {
        nextRowIsHeader = true
        return `<tr class="section"><th colspan="${columnCount}">${escapeExcelHtml(row[0])}</th></tr>`
      }

      const isHeader = nextRowIsHeader
      nextRowIsHeader = false
      const tag = isHeader ? 'th' : 'td'
      const cells = row
        .map((cell, index) => {
          const className = index === 0 || /^\d+([.,]\d+)?$/.test(String(cell ?? '')) ? ' class="center"' : ''
          return `<${tag}${className}>${escapeExcelHtml(cell)}</${tag}>`
        })
        .join('')

      return `<tr class="${isHeader ? 'table-header' : ''}">${cells}</tr>`
    })
    .join('')
}

export function downloadStyledExcel(filename, { title, rows, subtitle = '', generatedAt = new Date() }) {
  const columnCount = maxColumnCount(rows)
  const colgroup = Array.from({ length: columnCount })
    .map((_, index) => {
      const width = index === 0 ? 54 : index === 1 ? 130 : 150
      return `<col style="width:${width}px" />`
    })
    .join('')

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            margin: 0;
            color: #172033;
            font-family: "Be Vietnam Pro", Arial, sans-serif;
            font-size: 11pt;
          }

          table.report {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .title th {
            padding: 16px 12px 8px;
            border: 1px solid #0f7f75;
            background: #0f7f75;
            color: #ffffff;
            font-size: 18pt;
            font-weight: 700;
            text-align: center;
            text-transform: uppercase;
          }

          .subtitle td,
          .generated td {
            padding: 7px 10px;
            border: 1px solid #d8e0ea;
            color: #475569;
            font-size: 10pt;
            text-align: center;
          }

          .section th {
            padding: 10px 12px;
            border: 1px solid #9ccdc8;
            background: #eaf8f5;
            color: #0f5f58;
            font-size: 13pt;
            font-weight: 700;
            text-align: left;
          }

          tr.table-header th,
          .report > tbody > tr:first-child th {
            padding: 9px 8px;
            border: 1px solid #0f7f75;
            background: #0f7f75;
            color: #ffffff;
            font-size: 11pt;
            font-weight: 700;
            text-align: center;
            vertical-align: middle;
            white-space: normal;
          }

          td {
            padding: 8px;
            border: 1px solid #d8e0ea;
            background: #ffffff;
            font-size: 11pt;
            vertical-align: top;
            white-space: normal;
          }

          tr:nth-child(even) td {
            background: #f8fafc;
          }

          td.center,
          th.center {
            text-align: center;
            vertical-align: middle;
          }

          .blank td {
            height: 10px;
            border: 0;
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <table class="report">
          <colgroup>${colgroup}</colgroup>
          <thead>
            <tr class="title"><th colspan="${columnCount}">${escapeExcelHtml(title || 'Báo cáo')}</th></tr>
            ${
              subtitle
                ? `<tr class="subtitle"><td colspan="${columnCount}">${escapeExcelHtml(subtitle)}</td></tr>`
                : ''
            }
            <tr class="generated"><td colspan="${columnCount}">Ngày xuất: ${escapeExcelHtml(
              generatedAt.toLocaleString('vi-VN'),
            )}</td></tr>
          </thead>
          <tbody>${renderRows(rows, columnCount)}</tbody>
        </table>
      </body>
    </html>`

  const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizeFilename(filename)
  link.click()
  URL.revokeObjectURL(url)
}
