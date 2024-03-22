import os
import subprocess
from urllib.request import urlretrieve
from zipfile import ZipFile

def download_skybrush():
    """Downloads and extracts the Skybrush server from a GitHub repository ZIP file."""
    print("Downloading Skybrush server from GitHub...")
    # GitHub URL to download the repo as a ZIP file
    url = "https://github.com/skybrush-io/skybrush-server/archive/refs/heads/master.zip"
    filename = "skybrush-server-main.zip"

    # Download the ZIP file
    urlretrieve(url, filename)

    # Extract the ZIP file
    with ZipFile(filename, 'r') as zip_ref:
        zip_ref.extractall("../")  # Extract to the parent directory

    extracted_folder_name = "skybrush-server-main"
    os.rename(os.path.join("../", extracted_folder_name), "../skybrush-server")

    # Remove the ZIP file after extraction
    os.remove(filename)
    print("Skybrush server downloaded and extracted successfully.")

def check_skybrush_server():
    """Checks if the Skybrush server directory exists."""
    return os.path.exists("../skybrush-server")

def run_batch_file(batch_file):
    """Executes a given batch file."""
    subprocess.call([batch_file], shell=True)

def main():
    # Check if the skybrush-server directory exists
    if check_skybrush_server():
        print("Skybrush server is already installed.")
        run_batch_file("startup.bat")
    else:
        # Download and set up Skybrush server if the folder doesn't exist
        download_skybrush()
        run_batch_file("install.bat")

if __name__ == "__main__":
    main()
