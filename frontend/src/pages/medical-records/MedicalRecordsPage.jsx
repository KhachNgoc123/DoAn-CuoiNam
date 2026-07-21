import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
    getAllMedicalRecords,
    createMedicalRecord,
    updateMedicalRecord
} from "../../api/medicalRecordApi";

import MedicalRecordEntryView from "../../components/medical-records/MedicalRecordEntryView";
import MedicalRecordTable from "../../components/medical-records/MedicalRecordTable";
import MedicalRecordListHeader from "../../components/medical-records/MedicalRecordListHeader";
import Toast from "../../components/ui/Toast";

export default function MedicalRecordsPage(){
    const navigate = useNavigate();
    const location = useLocation();
    const selectedPatient = location.state?.patient;
    console.log("selectedPatient:", selectedPatient);
    const [records,setRecords] = useState([]);
    const [loading,setLoading] = useState(true);
    const [showForm,setShowForm] = useState(false);
    const [editingRecord,setEditingRecord] = useState(null);
    const [toast,setToast] = useState(null);
    useEffect(()=>{
        loadRecords();
    },[]);
  useEffect(() => {
  if (selectedPatient) {
    setEditingRecord(null);
    setShowForm(true);
  }
}, [selectedPatient]);
    async function loadRecords(){
        setLoading(true);
        try{
            const response = await getAllMedicalRecords();
            setRecords(response.data || []);
        }
        catch(error){
            console.error(error);
            setRecords([]);
        }
        finally{
            setLoading(false);
        }
    }
    async function saveRecord(payload){
        try{
            if(editingRecord){
                await updateMedicalRecord(
                    editingRecord.record_id,
                    payload
                );
                setToast({
                    type:"success",
                    message:"Cập nhật hồ sơ thành công"
                });
            }
            else{
                await createMedicalRecord(payload);
                setToast({
                    type:"success",
                    message:"Thêm hồ sơ thành công"
                });
            }
            setShowForm(false);
            setEditingRecord(null);
            loadRecords();
        }
        catch(error){
            console.error(error);
            setToast({
                type:"error",
                message:"Lưu hồ sơ thất bại"
            });
        }
    }
    if(showForm){
        return (
            <MedicalRecordEntryView
            editingRecord={editingRecord}
            selectedPatient={selectedPatient}
            saving={false}
            onSubmit={saveRecord}
            onCancel={() => {
                setShowForm(false);
                setEditingRecord(null);
            }}
            onCloseToast={() => setToast(null)}
        />
        )
    }
    return (
        <>
        <MedicalRecordListHeader
            onCreate={()=>{
                setEditingRecord(null);
                setShowForm(true);
            }}
        />
        <MedicalRecordTable
            records={records}
            loading={loading}
            onView={(record)=>{
                navigate(
                    `/medical-records/${record.record_id}`
                );
            }}
            onEdit={(record)=>{
                setEditingRecord(record);
                setShowForm(true);
            }}
        />
        <Toast
            toast={toast}
            onClose={()=>setToast(null)}
        />
        </>
    )
}