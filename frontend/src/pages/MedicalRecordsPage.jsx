import { useEffect, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { getAllMedicalRecords } from "../api/patientApi";
import { getErrorMessage } from "../api/client";

export default function MedicalRecordsPage() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("Tất cả");
    const [date, setDate] = useState("");

    useEffect(() => {
        loadRecords();
    }, []);

    async function loadRecords() {
        try {
            setLoading(true);

            const response = await getAllMedicalRecords();

            console.log(response);

            // Backend trả về:
            // {
            //   success: true,
            //   data: [...]
            // }

            setRecords(response.data ?? []);
        } catch (error) {
            alert(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    async function search() {
        // Hiện tại backend chưa có API tìm kiếm
        // nên tạm thời chỉ load lại danh sách

        loadRecords();
    }

    return (
        <>
            <div className="search-bar">
                <input
                    placeholder="Mã hồ sơ, bệnh nhân..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    <option>Tất cả</option>
                    <option>Đang điều trị</option>
                    <option>Theo dõi</option>
                    <option>Hoàn thành</option>
                </select>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

                <button onClick={search}>
                    Tìm kiếm
                </button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Mã hồ sơ</th>
                        <th>Bệnh nhân</th>
                        <th>Ngày lập</th>
                        <th>Chẩn đoán</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>

                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan={7}>Đang tải...</td>
                        </tr>
                    )}

                    {!loading &&
                        records.map((record, index) => (
                            <tr key={record.record_id}>
                                <td>{index + 1}</td>

                                <td>HS-{record.record_id}</td>

                                <td>
                                    <strong>
                                        {record.patient?.full_name ?? "Chưa có"}
                                    </strong>
                                    <br />
                                    {record.patient?.phone}
                                </td>

                                <td>
                                    {record.visit_date
                                        ? new Date(
                                              record.visit_date
                                          ).toLocaleDateString("vi-VN")
                                        : ""}
                                </td>

                                <td>
                                    {record.diagnosis?.diagnosis_name ??
                                        record.diagnosis ??
                                        ""}
                                </td>

                                <td>{record.status}</td>

                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-action btn-view"
                                            title="Xem chi tiết"
                                            onClick={() =>
                                                console.log(
                                                    "Xem",
                                                    record.record_id
                                                )
                                            }
                                        >
                                            <Eye size={18} />
                                        </button>

                                        <button
                                            className="btn-action btn-edit"
                                            title="Chỉnh sửa"
                                            onClick={() =>
                                                console.log(
                                                    "Sửa",
                                                    record.record_id
                                                )
                                            }
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                    {!loading && records.length === 0 && (
                        <tr>
                            <td colSpan={7}>
                                Không có dữ liệu.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </>
    );
}