
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
const Addstudent = ({ open, handleClose, addStudentData, editData }) => {

    const [student, setStudent] = useState({
        name: "",
        email: "",
        phone: "",
        course: "",
        fees: "",
        address: ""
    });
    useEffect(() => {

        if (!open) return;

        if (editData) {

            setStudent({
                name: editData?.name ?? "",
                email: editData?.email ?? "",
                phone: editData?.phone ?? "",
                course: editData?.course ?? "",
                fees: editData?.fees ?? "",
                address: editData?.address ?? ""
            });

        } else {

            setStudent({
                name: "",
                email: "",
                phone: "",
                course: "",
                fees: "",
                address: ""
            });

        }

    }, [open, editData]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setStudent(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {

            let url = "http://localhost:5000/api/finance/addStudentFinance";
            let method = "POST";

            if (editData) {
                url = `http://localhost:5000/api/finance/updateStudentFinance/${editData.id}`;
                method = "PUT";
            }

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(student)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.log("Server Error 👉", errorText);
                return;
            }

            const result = await response.json();

            console.log("Saved in DB 👉", result);

            addStudentData(result);
            handleClose();

            setStudent({
                name: "",
                email: "",
                phone: "",
                course: "",
                fees: "",
                address: ""
            });

        } catch (error) {
            console.log("API Error 👉", error);
        }
    };

    if (!open) return null;

    return (
        <div style={overlay}>
            <div style={{ ...modal, position: "relative" }}>

                {/* CLOSE ICON */}
                <X
                    onClick={handleClose}
                    size={22}
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        cursor: "pointer",
                        color: "#555"
                    }}
                />
                <h2>Add Student Details</h2>

                <form onSubmit={handleSubmit}>

                    <input
                        name="name"
                        placeholder="Student Name"
                        value={student.name}
                        onChange={handleChange}
                        required
                    /><br /><br />

                    <input
                        name="email"
                        placeholder="Email"
                        value={student.email}
                        onChange={handleChange}
                        required
                    /><br /><br />

                    <input
                        name="phone"
                        placeholder="Phone"
                        value={student.phone}
                        onChange={handleChange}
                        required
                    /><br /><br />

                    <input
                        name="course"
                        placeholder="Course"
                        value={student.course}
                        onChange={handleChange}
                    /><br /><br />

                    <input
                        name="fees"
                        placeholder="Fees Amount"
                        value={student.fees}
                        onChange={handleChange}
                    /><br /><br />

                    <textarea
                        name="address"
                        placeholder="Address"
                        value={student.address}
                        onChange={handleChange}
                    /><br /><br />

                    <button type="submit">Save&</button>
                    <button type="button" onClick={handleClose}>Close</button>

                </form>
            </div>
        </div>
    );
};

const overlay = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
};

const modal = {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "400px"
};

export default Addstudent;