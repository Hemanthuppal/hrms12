import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../App'; // Import your Firestore database configuration
import { Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaCalendarAlt } from 'react-icons/fa';

const MarkAttendance = () => {
  const location = useLocation();
  const loggedInEmployeeId = location.state?.loggedInEmployeeId;
  const loggedInEmployeeName = location.state?.loggedInEmployeeName;

  const [name, setName] = useState(loggedInEmployeeName || '');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const toFirebaseTimestamp = (date) => {
    return Timestamp.fromDate(date);
  };

  const fromFirebaseTimestamp = (timestamp) => {
    return timestamp.toDate();
  };

  const handleUserNameChange = (event) => {
    setName(event.target.value);
  };


  const updateAttendanceInDB = async (records, status) => {
    if (!loggedInEmployeeId) {
      console.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    const currentDate = new Date().toISOString().split('T')[0];

    // Retrieve the user document to get the assigned manager UID
    const userDocRef = doc(db, 'users', loggedInEmployeeId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const loggedInEmployee = userDocSnap.data();
      const assignedManagerUid = loggedInEmployee.assignedManagerUid;

      // Update employee's attendance
      const employeeAttendanceCollection = collection(db, `attendances_${loggedInEmployeeId}`);
      const employeeDateDoc = doc(employeeAttendanceCollection, `${currentDate}_${loggedInEmployeeId}`);

      const totalDurationHours = calculateTotalDurationInHours(records);
      const formattedTotalDuration = formatDuration(totalDurationHours);
      const isPresent = totalDurationHours >= 8;

      const recordsForFirebase = records.map((record) => ({
        checkIn: record.checkIn ? toFirebaseTimestamp(record.checkIn) : null,
        checkOut: record.checkOut ? toFirebaseTimestamp(record.checkOut) : null,
      }));

      try {
        // Update employee's attendance
        await setDoc(employeeDateDoc, {
          name: name,
          records: recordsForFirebase,
          totalDuration: formattedTotalDuration,
          status: status, // Use the passed status
          employeeUid: loggedInEmployeeId,
        });
      
        // Update assigned manager's attendance
        if (assignedManagerUid) {
          const managerAttendanceCollection = collection(db, `attendance_${assignedManagerUid}`);
          const managerDateDoc = doc(managerAttendanceCollection, `${currentDate}_${loggedInEmployeeId}`);
      
          try {
            await setDoc(managerDateDoc, { // Use managerDateDoc here
              name: name,
              records: recordsForFirebase,
              totalDuration: formattedTotalDuration,
              status: status, // Use the passed status
              employeeUid: loggedInEmployeeId,
            });
          } catch (error) {
            console.error('Error updating manager attendance data:', error);
          }
        }
      } catch (error) {
        console.error('Error updating employee attendance data:', error);
      }   
     } else {
      console.error('User not found');
    }

    setIsLoading(false);
  };



  const handleCheckIn = () => {
    const newRecords = [...attendanceRecords, { checkIn: new Date(), checkOut: null }];
    setAttendanceRecords(newRecords);
    setAttendanceStatus('Checked In'); // Update attendance status to 'Checked In'
    updateAttendanceInDB(newRecords, 'P').then(() => {
      window.alert('Successfully logged in!');
    });
  };
  
  const handleCheckOut = () => {
    const newRecords = [...attendanceRecords];
    const lastIndex = newRecords.length - 1;
    if (lastIndex >= 0 && !newRecords[lastIndex].checkOut) {
      newRecords[lastIndex].checkOut = new Date();
      setAttendanceRecords(newRecords);
      const totalDurationHours = calculateTotalDurationInHours(newRecords);
      const status = totalDurationHours >= 8 ? 'P' : 'A';
      setAttendanceStatus('Checked Out'); // Update attendance status to 'Checked Out'
      updateAttendanceInDB(newRecords, status).then(() => {
        window.alert(`Successfully logged out! Status: ${status}`);
      });
    }
  };

  const calculateStatus = (records) => {
    const totalDurationHours = calculateTotalDurationInHours(records);
    return totalDurationHours >= 8;
  };

  const formatDuration = (durationHours) => {
    if (durationHours < 1) {
      // Convert to minutes and round off
      const minutes = Math.round(durationHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      // Round to two decimal places for hours
      const hoursRounded = Math.round(durationHours * 100) / 100;
      return `${hoursRounded} hour${hoursRounded !== 1 ? 's' : ''}`;
    }
  };

  const calculateTotalDurationInHours = (records) => {
    return records.reduce((total, record) => {
      if (record.checkIn && record.checkOut) {
        const checkIn = record.checkIn instanceof Date ? record.checkIn : fromFirebaseTimestamp(record.checkIn);
        const checkOut = record.checkOut instanceof Date ? record.checkOut : fromFirebaseTimestamp(record.checkOut);
        return total + (checkOut - checkIn) / (1000 * 60 * 60); // Convert to hours
      }
      return total;
    }, 0);
  };

  useEffect(() => {
    if (loggedInEmployeeId) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const attendanceCollection = collection(db, `attendances_${loggedInEmployeeId}`);
      const dateDoc = doc(attendanceCollection,`${formattedDate}_${loggedInEmployeeId}`);

      getDoc(dateDoc).then((docSnapshot) => {
        if (docSnapshot.exists()) {
          const existingAttendance = docSnapshot.data();
          const recordsWithDates = existingAttendance.records.map((record) => ({
            checkIn: record.checkIn ? fromFirebaseTimestamp(record.checkIn) : null,
            checkOut: record.checkOut ? fromFirebaseTimestamp(record.checkOut) : null,
          }));
          setAttendanceRecords(recordsWithDates);
          // Set attendance status based on the last record
          if (recordsWithDates.length > 0 && !recordsWithDates[recordsWithDates.length - 1].checkOut) {
            setAttendanceStatus('Checked In');
          } else {
            setAttendanceStatus('Checked Out');
          }
        }
      });
    }
  }, [loggedInEmployeeId, selectedDate]);


  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Custom Input for DatePicker
  const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
    <button className="custom-datepicker-input form-control " onClick={onClick} ref={ref}>
      {value} &nbsp; &nbsp; <FaCalendarAlt className="calendar-icon " />
    </button>
  ));
  // Filter attendance records for the selected date
  const filteredRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.checkIn).toISOString().split('T')[0];
    return recordDate === selectedDate.toISOString().split('T')[0];
  });
  return (
    <>
    <div className='attendance_container'>
      <h2  style={{color:'#150981',textAlign:'center',marginTop:'10px'}}>Mark Attendance</h2>
      {attendanceStatus && (
        <div style={{ marginBottom: '5px',marginTop: '5px' }}>
          <p style={{ color: attendanceStatus === 'Checked In' ? 'green' : 'red',textAlign:'center',fontWeight: 'bold' }}>{attendanceStatus}</p>
        
        </div>
      )}
      <div>
      <div id="status" class="mb-4" style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="success"
            onClick={handleCheckIn}
            disabled={isLoading || (attendanceRecords.length > 0 && !attendanceRecords[attendanceRecords.length - 1].checkOut)}
            style={{width:'18%',padding:'10px', fontSize:'18px', marginRight: '10px'}}
          >
            Check-In
          </Button>
          { " "}
          <Button
            variant="danger"
            onClick={handleCheckOut}
            disabled={isLoading || !attendanceRecords.length || attendanceRecords[attendanceRecords.length - 1].checkOut}
            style={{width:'18%',padding:'10px', fontSize:'18px'}}
          >
            Check-Out
          </Button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <label style={{ marginRight: '10px',marginTop:'5px',fontSize: '18px' }}>Select Date:</label>
          <DatePicker 
            selected={selectedDate} 
            onChange={handleDateChange} 
            dateFormat="dd/MM/yyyy"
            className="form-control"
            customInput={<CustomInput />}
          />

          </div>
      </div>
      <div style={{ margin: '0 auto', maxWidth: '80%' }}>
     <table className="styled-table">
       <thead>
         <tr>
           <th>S.No</th>
           <th>Check-In</th>
           <th>Check-Out</th>
           <th>Total Time</th>
         </tr>
       </thead>
       <tbody>
              {filteredRecords.map((record, index) => {
                const checkInTime = record.checkIn ? record.checkIn.toLocaleTimeString('en-US', { hour12: true }).toUpperCase() : "-";
                const checkOutTime = record.checkOut ? record.checkOut.toLocaleTimeString('en-US', { hour12: true }).toUpperCase() : "-";
                const totalDuration = checkInTime !== "-" && checkOutTime !== "-" ? `${Math.floor((record.checkOut - record.checkIn) / (1000 * 60 * 60))} h ${Math.floor(((record.checkOut - record.checkIn) / (1000 * 60)) % 60)} m` : '-';
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{checkInTime}</td>
                    <td>{checkOutTime}</td>
                    <td>{totalDuration}</td>
                  </tr>
                );
              })}
            </tbody>
     </table>
   </div>
    </div>
     
   </> 
  );
};

export default MarkAttendance;
