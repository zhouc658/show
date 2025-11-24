import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import "./App.css"

const BASE_URL = import.meta.env.BASE_URL; 

const initialImages = [
  { id: 1, url: `${BASE_URL} + images/bunny.png`, title: "One" },
  { id: 2, url: "images/wolf.png", title: "Two" },
  { id: 3, url: "/images/sheep.png", title: "Three" },
  { id: 4, url: "/images/grass.png", title: "four" },
  { id: 5, url: "/images/carrot.png", title: "five" },
  { id: 6, url: "/images/catch.png", title: "six" },
];

export default function GalleryFeedback() {
  const [images, setImages] = useState(initialImages); // props images
  const [stageImages, setStageImages] = useState([]); // images on the stage
  const [draggedId, setDraggedId] = useState(null);
  const galleryRef = useRef(null);
  const ws = useRef(null);

  // WebSocket setup
  useEffect(() => {
    ws.current = new WebSocket("wss://show-dx8g.onrender.com");

    ws.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type === 'move' || data.type === 'upload' || data.type === 'remove') {
        // Update stage and sidebar properly
        setStageImages(data.stageImages);
        setImages(data.sidebarImages);
      }
    };

    return () => ws.current.close();
  }, []);

  const broadcast = (type, sidebarImages, stageImages) => {
    ws.current?.send(JSON.stringify({ type, sidebarImages, stageImages }));
  };

  // Drag handlers
  const handleDragStart = (e, id) => setDraggedId(id);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedId) return;
    //Findind the x and y position after drop into the buttom container, then reset them to be center so minus 50 it not in corner
    const newX = e.nativeEvent.offsetX - 50;
    const newY = e.nativeEvent.offsetY - 50;


    let updatedStage = [...stageImages];

    const draggedOnStage = stageImages.find(i => i.id === draggedId.id);
    if (!draggedOnStage) {
      const newStageImage = {
        ...draggedId,
        id: Date.now(),
        x: newX,
        y: newY,
      };

      updatedStage = [...stageImages, newStageImage];

    } else {
      // Normal move on stage
      updatedStage = stageImages.map(img =>
        img.id === draggedId.id ? { ...img, x: newX, y: newY } : img
      );
    }

    setStageImages(updatedStage);

    broadcast("move", images, updatedStage);

    setDraggedId(null);
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, id) => ({
      id: Date.now() + id,
      // url: URL.createObjectURL(file),
      title: file.name,
    }));

    const updatedSidebar = [...images, ...newImages];
    setImages(updatedSidebar);
    broadcast("upload", updatedSidebar, stageImages);//take out stageImages
  };

  const handleDownloadGalleryImage = async () => {
    if (!galleryRef.current) return;
    const canvas = await html2canvas(galleryRef.current, { useCORS: true });
    const dataURL = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "gallery.png";
    link.click();
  };

  const removeImage = (imgToRemove) => {
    const updatedSidebar = images.filter(img => img.id !== imgToRemove.id);
    const updatedStage = stageImages.filter(img => img.id !== imgToRemove.id);

    setImages(updatedSidebar);
    setStageImages(updatedStage);

    // 🔥 Tell all clients immediately
    broadcast("remove", updatedSidebar, updatedStage);
  };



  return (
    <div className="container">
      <h2>Welcome to the Show</h2>
      <h4>Work together to create a scene or story by dragging the props from the left. You can also upload images of your own props to use. And then download to record each scene.</h4>
      <label className="upload-btn">     {/* created another class so that I can style the upload botton to get rid of choose file */}
        <b>Upload More Props</b>
        <input
          type="file"
          multiple //allow user to upload more than one image at once
          onChange={handleUpload}
        />
      </label>


      <button
        onClick={handleDownloadGalleryImage}
        className="download-btn"
      >
        Download Gallery as Image
      </button>

      <div className="sidebar">
        {images.map(img => (
          <div key={img.id}
            draggable
            onDragStart={(e) => handleDragStart(e, img)}>
            <img
              src={img.url}
              alt={img.title}

            />
            <button
              className="remove-btn"
              onClick={() => removeImage(img)}
            >
              x
            </button>
          </div>
        ))}

      </div>

      <div className="gallery" ref={galleryRef} onDrop={handleDrop} onDragOver={handleDragOver}>
        {stageImages.map((img) => (
          <div
            key={img.id}
            className="gallery-item"
            style={{ left: img.x, top: img.y }}
            draggable
            onDragStart={(e) => handleDragStart(e, img)}
            
          >
            <img src={img.url} alt={img.title} />
            <button className="remove-btn" onClick={() => removeImage(img)}>x</button>
          </div>
        ))}
      </div>

    </div>
  );
}
