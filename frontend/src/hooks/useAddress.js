import { useEffect, useMemo, useRef, useState } from 'react'
import { getProvinceDetail, getProvinces } from '../api/provincesApi'

export default function useAddress(setForm){

    const [provinces,setProvinces]=useState([])
    const [wards,setWards]=useState([])

    const [provinceQuery,setProvinceQuery]=useState("")
    const [wardQuery,setWardQuery]=useState("")
    const [addressDetail,setAddressDetail]=useState("")

    const [selectedProvince,setSelectedProvince]=useState(null)
    const [selectedWard,setSelectedWard]=useState(null)

    const [provinceOpen,setProvinceOpen]=useState(false)
    const [wardOpen,setWardOpen]=useState(false)

    const [addressLoading,setAddressLoading]=useState(false)

    const provinceInputRef=useRef(null)
    const wardInputRef=useRef(null)

    useEffect(()=>{

        loadProvince()

    },[])

    async function loadProvince(){

        try{

            const data=await getProvinces()

            setProvinces(data)

        }catch{

            setProvinces([])

        }

    }

    async function chooseProvince(province){

        setSelectedProvince(province)

        setProvinceQuery(province.name)

        setSelectedWard(null)

        setWardQuery("")

        setAddressLoading(true)

        try{

            const detail=await getProvinceDetail(province.code)

            setWards(detail.wards||[])

        }finally{

            setAddressLoading(false)

        }

    }

    function chooseWard(ward){

        setSelectedWard(ward)

        setWardQuery(ward.name)

    }

    function changeAddressDetail(value){

        setAddressDetail(value)

    }

    useEffect(()=>{

        const address=[
            addressDetail,
            wardQuery,
            provinceQuery
        ]
        .filter(Boolean)
        .join(", ")

        setForm(current=>({

            ...current,

            address

        }))

    },[
        addressDetail,
        wardQuery,
        provinceQuery
    ])

    const provinceSuggestions=useMemo(()=>{

        return provinces.filter(item=>

            item.name
            .toLowerCase()
            .includes(provinceQuery.toLowerCase())

        )

    },[provinceQuery,provinces])

    const wardSuggestions=useMemo(()=>{

        return wards.filter(item=>

            item.name
            .toLowerCase()
            .includes(wardQuery.toLowerCase())

        )

    },[wardQuery,wards])

    return{

        provinceInputRef,
        wardInputRef,

        provinceQuery,
        wardQuery,
        addressDetail,

        provinceSuggestions,
        wardSuggestions,

        provinceOpen,
        wardOpen,

        selectedProvince,

        addressLoading,

        setProvinceOpen,
        setWardOpen,

        setProvinceQuery,
        setWardQuery,

        chooseProvince,
        chooseWard,

        changeAddressDetail

    }

}