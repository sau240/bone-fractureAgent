
const API_BASE_URL = "http://127.0.0.1:5000"; // your backend URL

export const uploadBoneImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Upload failed");
    }
    return res.json();
};
