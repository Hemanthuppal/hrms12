import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

// Import Firestore instead of Firebase Realtime Database
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../App"; // Import your firebase app configuration

const PayslipForm = () => {
  const [grossFixed, setGrossFixed] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [hra, setHra] = useState("");
  const [transportAllowance, setTransportAllowance] = useState("");
  const [medicalReimbursement, setMedicalReimbursement] = useState("");
  const [fixedAllowance, setFixedAllowance] = useState("");
  const [grossSalary, setGrossSalary] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [levels, setLevels] = useState(Array.from({ length: 19 }, (_, i) => `${i + 1}`)); // Levels from 1 to 20
  const [selectedLevel, setSelectedLevel] = useState(levels[0]);
  const [selectedRange, setSelectedRange] = useState(''); // For selected salary range dropdown

  const levelToSalaryRangeOptions = levels.reduce((acc, level) => {
    const base = (level - 1) * 5000 + 10000; // Starting at 10k for level 1
    acc[level] = `${base}k to ${base + 5000}k`;
    return acc;
  }, {});

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    setSelectedRange(levelToSalaryRangeOptions[level]); // Automatically select the corresponding range
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    // Additional logic could be added here if you need to adjust other state based on range change
  };

  const handleGrossFixedChange = (e) => {
    const value = parseFloat(e.target.value); // Ensure the value is a number
    setGrossFixed(value);
  
    // Calculate salary components based on gross fixed
    const basic = value * 0.4;
    setBasicSalary(basic.toFixed(2));
    setHra((basic * 0.4).toFixed(2));
    
    const transportAllowance = 1600;
    const medicalReimbursement = 1250;
    setTransportAllowance(transportAllowance);
    setMedicalReimbursement(medicalReimbursement);
    
    const fixedAllowance = value - (basic + basic * 0.4 + transportAllowance + medicalReimbursement);
    setFixedAllowance(fixedAllowance.toFixed(2));
  
    const gross = basic + basic * 0.4 + transportAllowance + medicalReimbursement + fixedAllowance;
    setGrossSalary(gross.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const payslipData = {
      grossFixed,
      basicSalary,
      hra,
      transportAllowance,
      medicalReimbursement,
      fixedAllowance,
      grossSalary,
      selectedLevel,
      selectedRange,
      timestamp: new Date().toISOString(),
    };
  
    try {
      const db = getFirestore(app);
      const docRef = await addDoc(collection(db, "payslips"), payslipData);
      console.log("Document written with ID: ", docRef.id);
  
      // Reset form and state as necessary
      setGrossFixed('');
      setBasicSalary('');
      setHra('');
      setTransportAllowance('');
      setMedicalReimbursement('');
      setFixedAllowance('');
      setGrossSalary('');
  
      setShowSuccessModal(true); // Show success modal
      
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };
  return (
    <div className="container">
    <div className="row">
      <div className="col-md-3"></div>
      <div className="col-md-6">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title text-center">Payslip Form</h2>

            <div className="d-flex justify-content-between mb-3">
              <DropdownButton id="dropdown-basic-button" title={`Level ${selectedLevel}`}>
                {levels.map((level) => (
                  <Dropdown.Item key={level} onClick={() => handleLevelChange(level)}>
                    Level {level}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
              <DropdownButton id="dropdown-range-selector" title={selectedRange || 'Select Range'}>
                {Object.entries(levelToSalaryRangeOptions).map(([level, range]) => (
                  <Dropdown.Item key={level} onClick={() => handleRangeChange(range)}>
                    {range}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="grossFixed" className="form-label">
                  GROSS FIXED:
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="grossFixed"
                  value={grossFixed}
                  onChange={handleGrossFixedChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">BASIC SALARY:</label>
                <input type="text" className="form-control" value={basicSalary} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">HRA:</label>
                <input type="text" className="form-control" value={hra} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">TRANSPORT ALLOWANCE:</label>
                <input type="text" className="form-control" value={transportAllowance} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">MEDICAL REIMBURSEMENT:</label>
                <input type="text" className="form-control" value={medicalReimbursement} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">FIXED ALLOWANCE:</label>
                <input type="text" className="form-control" value={fixedAllowance} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">GROSS SALARY:</label>
                <input type="text" className="form-control" value={grossSalary} readOnly />
              </div>
              
              <div className="mt-4">
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="col-md-3"></div>
    </div>
    <Modal show={showSuccessModal} onHide={handleCloseSuccessModal}>
      <Modal.Header closeButton>
        <Modal.Title>Success</Modal.Title>
      </Modal.Header>
      <Modal.Body>Data submitted successfully!</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseSuccessModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
);
};

export default PayslipForm;
