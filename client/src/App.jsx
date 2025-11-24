import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import "./App.css"

const initialImages = [
  { id: 1, url: "/images/bunny.png", title: "One" },
  { id: 2, url: "/images/wolf.png", title: "Two" },
  { id: 3, url: "/images/sheep.png", title: "Three" },
  { id: 3, url: "/images/grass.png", title: "Three" },
  { id: 3, url: "/images/carrot.png", title: "Three" },
  { id: 3, url: "/images/catch.png", title: "Three" },
];

export default function GalleryFeedback() {
  const [images, setImages] = useState(initialImages); // props images
  const [stageImages, setStageImages] = useState([]); // images on the stage
  const [draggedId, setDraggedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const galleryRef = useRef(null);
  const ws = useRef(null);

  // WebSocket setup
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:3001");

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

    // Get container position
    const rect = galleryRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - 50; // 50 is half image width
    const newY = e.clientY - rect.top - 50;  // 50 is half image height

    let updatedStage = [...stageImages];
    let updatedSidebar = [...images];

    const draggedOnStage = stageImages.find(i => i.id === draggedId.id);

    if (hoveredId && hoveredId.id !== draggedId.id && draggedOnStage) {
      // Swap positions on stage
      const draggedImg = stageImages.find(img => img.id === draggedId.id);
      const hoveredImg = stageImages.find(img => img.id === hoveredId.id);

      updatedStage = stageImages.map(img => {
        if (img.id === draggedId.id) return { ...img, x: hoveredImg.x, y: hoveredImg.y };
        if (img.id === hoveredId.id) return { ...img, x: draggedImg.x, y: draggedImg.y };
        return img;
      });

    } else if (!draggedOnStage) {
      const newStageImage = {
        ...draggedId,
        id: Date.now(),
        x: newX,
        y: newY
      };

      updatedStage = [...stageImages, newStageImage];

    } else {
      // Normal move on stage
      updatedStage = stageImages.map(img =>
        img.id === draggedId.id ? { ...img, x: newX, y: newY } : img
      );
    }

    setStageImages(updatedStage);
    setImages(updatedSidebar);

    broadcast("move", images, updatedStage);

    setDraggedId(null);
    setHoveredId(null);
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, idx) => ({
      id: Date.now() + idx,
      url: URL.createObjectURL(file),
      title: file.name,
      x: 0,
      y: 0,
    }));

    const updatedSidebar = [...images, ...newImages];
    setImages(updatedSidebar);
    broadcast("upload", updatedSidebar, stageImages);
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
            onDragOver={(e) => {
              e.preventDefault();
              setHoveredId(img);
            }}
            onDragLeave={() => setHoveredId(null)}
          >
            <img src={img.url} alt={img.title} />
            <button className="remove-btn" onClick={() => removeImage(img)}>x</button>
          </div>
        ))}
      </div>

    </div>
  );
}
