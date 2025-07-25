import React, { useState, useEffect, useRef } from "react";
import Duration from "./Features/Duration";
import Maps from "./Features/Maps";
import Calendar from "./Features/Calendar";
import Meeting from "./Features/Meeting";
import ConfirmationModal from "./ConfirmationModal";
import { FaGoogle, FaMicrosoft, FaVideo } from "react-icons/fa";
import "leaflet/dist/leaflet.css";

interface PersonalModalFormProps {
  onClose: () => void;
  userDetails: {
    referenceid: string;
    manager: string;
    tsm: string;
  };
}

const TooltipIcon: React.FC<{ tip: string }> = ({ tip }) => (
  <span
    className="ml-1 text-blue-500 cursor-help"
    title={tip}
    aria-label={tip}
    role="tooltip"
    style={{ fontWeight: "bold" }}
  >
    &#9432;
  </span>
);

const PersonalModalForm: React.FC<PersonalModalFormProps> = ({ onClose, userDetails }) => {
  const [activitystatus, setActivityStatus] = useState("");
  const [activityremarks, setActivityRemarks] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [startdate, setStartDate] = useState(new Date());
  const [enddate, setEndDate] = useState(new Date());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const targetStatuses = ["Client Visit", "Site Visit", "On Field"];
    const isTargetStatus = targetStatuses.includes(activitystatus);

    if (isTargetStatus) {
      setShowCamera(true);
      startCamera();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(coords);

          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
            .then((res) => res.json())
            .then((data) => {
              const address = data.display_name || `${coords.lat}, ${coords.lng}`;
              setLocationAddress(address);
              setActivityRemarks(address);
            })
            .catch(() => {
              setActivityRemarks(`${coords.lat}, ${coords.lng}`);
            });
        },
        (err) => {
          console.error("Location error:", err);
          setActivityRemarks("Unable to fetch location.");
        }
      );
    } else {
      setShowCamera(false);
      setImageBlob(null);
      setImageUrl("");
      setLocation(null);
      setLocationAddress("");
      setActivityRemarks("");
    }
  }, [activitystatus]);


  useEffect(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    setStartDate(now);
    if (duration !== null) {
      const newEnd = new Date(now.getTime() + duration * 60000);
      setEndDate(newEnd);
    } else {
      setEndDate(now);
    }
  }, [duration]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Failed to access camera:", err);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            setImageBlob(blob);
          }
        }, "image/jpeg");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const payload: any = {
      referenceid: userDetails.referenceid,
      manager: userDetails.manager,
      tsm: userDetails.tsm,
      activitystatus,
      activityremarks,
      startdate: startdate.toISOString(),
      enddate: enddate.toISOString(),
    };

    if (imageBlob) {
      const formData = new FormData();
      formData.append("file", imageBlob);
      formData.append("upload_preset", "your_upload_preset");

      const cloudRes = await fetch("https://api.cloudinary.com/v1_1/your_cloud_name/image/upload", {
        method: "POST",
        body: formData,
      });
      const cloudData = await cloudRes.json();
      payload.selfieUrl = cloudData.secure_url;
    }

    try {
      const response = await fetch("/api/ModuleSales/Task/DailyActivity/AddActivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(await response.text());

      setShowConfirmModal(false);
      onClose();
    } catch (error) {
      console.error("Error submitting activity:", error);
      alert("An error occurred while submitting. Please try again.");
    }
  };

  const showCalendar = [
    "Assisting other Agents Client",
    "Coordination of SO to Warehouse",
    "Coordination of SO to Orders",
    "Updating Reports",
    "Email and Viber Checking",
  ].includes(activitystatus);

  const showMeetingLinks = ["Client Meeting", "Group Meeting"].includes(activitystatus);
  const isFormValid = activitystatus && duration !== null && activityremarks.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative text-xs">
          <h2 className="text-sm font-bold mb-4">Personal Activity</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <input type="hidden" value={userDetails.referenceid} />
            <input type="hidden" value={userDetails.manager} />
            <input type="hidden" value={userDetails.tsm} />
            <input type="hidden" value={startdate.toISOString()} />
            <input type="hidden" value={enddate.toISOString()} />

            <div>
              <label className="block mb-1 text-gray-700 font-bold flex items-center">Activity<TooltipIcon tip="Select the current activity status from the list." /></label>
              <select
                value={activitystatus}
                onChange={(e) => setActivityStatus(e.target.value)}
                required
                className="w-full px-3 py-2 border-b bg-white text-xs capitalize"
              >
                <option value="">-- Select an Option --</option>
                <option value="Assisting other Agents Client">Assisting other Agents Client</option>
                <option value="Coordination of SO to Warehouse">Coordination of SO to Warehouse</option>
                <option value="Coordination of SO to Orders">Coordination of SO to Orders</option>
                <option value="Updating Reports">Updating Reports</option>
                <option value="Email and Viber Checking">Email and Viber Checking</option>
                <optgroup label="─────────────"></optgroup>
                <option value="1st Break">1st Break</option>
                <option value="Client Meeting">Client Meeting</option>
                <option value="Coffee Break">Coffee Break</option>
                <option value="Group Meeting">Group Meeting</option>
                <option value="Last Break">Last Break</option>
                <option value="Lunch Break">Lunch Break</option>
                <option value="TSM Coaching">TSM Coaching</option>
                <optgroup label="─────────────"></optgroup>
                <option value="Client Visit">Client Visit</option>
                <option value="Site Visit">Site Visit</option>
                <option value="On Field">On Field</option>
              </select>
            </div>

            <Duration duration={duration} setDuration={setDuration} />

            <div>
              <label className="block mb-1 text-gray-700 font-bold flex items-center">Remarks<TooltipIcon tip="Provide additional notes or remarks." /></label>
              <textarea
                value={activityremarks}
                onChange={(e) => setActivityRemarks(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border-b text-xs resize-none"
                disabled={["Client Visit", "Site Visit", "On Field"].includes(activitystatus)}
              />
            </div>

            {location && (
              <Maps location={location} locationAddress={locationAddress} setLocation={setLocation} setActivityRemarks={setActivityRemarks} setLocationAddress={setLocationAddress} />
            )}

            {showCamera && (
              <div>
                <label className="block mb-1 text-gray-700 font-bold">Take a Photo</label>
                {!imageBlob ? (
                  <>
                    <video ref={videoRef} width="320" height="240" className="border mb-2" />
                    <button
                      type="button"
                      onClick={captureImage}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
                    >
                      Capture Photo
                    </button>
                  </>
                ) : (
                  <>
                    <canvas ref={canvasRef} width="320" height="240" style={{ display: "none" }} />
                    <img src={URL.createObjectURL(imageBlob)} alt="Captured" className="border mb-2" />
                    <p className="text-green-600">Image captured and ready to upload</p>
                  </>
                )}
              </div>
            )}

            {showCalendar && (<Calendar title={activitystatus} details={activityremarks} start={startdate} end={enddate} />)}
            {showMeetingLinks && <Meeting />}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border bg-white text-gray-800 text-[10px] rounded hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={!isFormValid} className={`px-4 py-2 text-white rounded text-[10px] ${isFormValid ? "bg-blue-400 hover:bg-blue-600" : "bg-gray-300 cursor-not-allowed"}`}>Submit</button>
            </div>
          </form>

          <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-lg" aria-label="Close">&times;</button>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmationModal
          userDetails={userDetails}
          activitystatus={activitystatus}
          activityremarks={activityremarks}
          startdate={startdate}
          enddate={enddate}
          duration={duration}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </>
  );
};

export default PersonalModalForm;
