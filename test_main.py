import unittest
from main import extract_metadata, process_gcs_file


class TestCloudStorageMetadataFunction(unittest.TestCase):

  def test_extract_metadata_success(self):
    payload = {
        "bucket": "test-bucket",
        "name": "data.csv",
        "size": "1048576",
        "contentType": "text/csv",
    }
    res = extract_metadata(payload)
    self.assertEqual(res["name"], "data.csv")
    self.assertEqual(res["size_mb"], 1.0)

  def test_extract_metadata_missing_bucket(self):
    with self.assertRaises(ValueError):
      extract_metadata({"name": "data.csv"})

  def test_process_gcs_file_success(self):
    payload = {"bucket": "test-bucket", "name": "test.txt", "size": "100"}
    res = process_gcs_file(payload)
    self.assertEqual(res["status"], "success")


if __name__ == "__main__":
  unittest.main()
