// Add this to your existing server file

// Function to get upload records from the database
const getUploadRecords = async () => {
  // This is a mock implementation - replace with your actual database query
  return [
    {
      id: 1,
      status: "Success",
      uploadDate: "2023-03-31T12:34:56.789Z",
      uploader: "330334"
    },
    {
      id: 2,
      status: "Failed",
      uploadDate: "2023-03-30T15:20:10.123Z",
      uploader: "330530"
    },
    {
      id: 3,
      status: "Success",
      uploadDate: "2023-03-29T09:15:30.456Z",
      uploader: "330334"
    }
  ];
};

app.get('/getUploadRecords', async (req, res) => {
  try {
    const records = await getUploadRecords();
    res.status(200).json({
      message: 'Upload records retrieved successfully',
      data: records,
    });
  } catch (error) {
    console.error('Error fetching upload records:', error.message);
    res.status(500).json({ message: 'An error occurred while fetching upload records' });
  }
});
