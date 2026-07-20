const BASE_URL = 'https://provinces.open-api.vn/api/v2'
const cache = new Map()

async function request(path) {
  if (cache.has(path)) return cache.get(path)

  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error('Không tải được dữ liệu địa chỉ.')
  }
  const data = await response.json()
  cache.set(path, data)
  return data
}

export async function getProvinces() {
  return request('/')
}

export async function getProvinceDetail(code) {
  return request(`/p/${code}?depth=2`)
}
