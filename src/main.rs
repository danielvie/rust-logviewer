#[macro_use] extern crate rocket;

use rocket::{response::content, serde::Serialize, serde::json::Json};

use std::{
    fs::{self, File},
    io::{self, Read},
    path::PathBuf,
    process::Command,
    vec,
};

#[derive(Debug, Serialize)]
#[serde(crate = "rocket::serde")]
pub enum Entry {
    Debug(String),
    Info(String),
    Warn(String),
    Error(String),
    Other(String),
}

/// Line # in the logfile and the parsed log data for that line
#[derive(Debug, Serialize)]
#[serde(crate = "rocket::serde")]
struct LogEntry {
    line: usize,
    entry: Entry,
}

impl LogEntry {
    fn debug(line: usize, msg: String) -> Self {
        LogEntry {
            line,
            entry: Entry::Debug(msg),
        }
    }

    fn info(line: usize, msg: String) -> Self {
        LogEntry {
            line,
            entry: Entry::Info(msg),
        }
    }

    fn warn(line: usize, msg: String) -> Self {
        LogEntry {
            line,
            entry: Entry::Warn(msg),
        }
    }

    fn error(line: usize, msg: String) -> Self {
        LogEntry {
            line,
            entry: Entry::Error(msg),
        }
    }

    fn other(line: usize, msg: String) -> Self {
        LogEntry {
            line,
            entry: Entry::Other(msg),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(crate = "rocket::serde")]
pub struct LogFile {
    filename: String,
    log_entries: Vec<LogEntry>,
}

#[derive(Debug, Default, Serialize)]
#[serde(crate = "rocket::serde")]
struct Resp {
    response: String,
    message: String,
    data: Option<Vec<LogFile>>,
}

impl Resp {
    fn success(data: Vec<LogFile>) -> Self {
        Self {
            data: Some(data),
            response: "ok".to_string(),
            ..Self::default()
        }
    }

    fn error(message: String) -> Self {
        Self {
            response: "error".to_string(),
            message,
            ..Self::default()
        }
    }
}

#[get("/")]
fn index() -> content::RawHtml<&'static str> {
    let index = include_str!("../web/index.html");
    content::RawHtml(index)
}

#[get("/log/<nro>")]
fn get_log(nro: usize) -> Json<Resp> {
    
    let _n = "AxiniApertureAdapter.log";
    println!("entrei com o nro: {}", nro);
    let files = match log_file_search() {
        Ok(files) => files,
        Err(e) => return Json(Resp::error(e.to_string())),
    };
    
    let ffiles: Vec<RawFile> = files.into_iter().enumerate().filter(|(i,_)| *i == nro ).map(|(_, val)| val).collect();
    
    let log_files = match parse_log_files(ffiles) {
        Ok(log_files) => log_files,
        Err(e) => return Json(Resp::error(e.to_string())),
    };

    Json(Resp::success(log_files))
}

#[get("/logs")]
fn get_logs() -> Json<Resp> {
    let files = match log_file_search() {
        Ok(files) => files,
        Err(e) => return Json(Resp::error(e.to_string())),
    };

    let log_files = match parse_log_files(files) {
        Ok(log_files) => log_files,
        Err(e) => return Json(Resp::error(e.to_string())),
    };

    Json(Resp::success(log_files))
}

#[derive(Debug)]
pub struct RawFile {
    filename: String,
    file: File,
}

pub fn parse_log_files(files: Vec<RawFile>) -> Result<Vec<LogFile>, io::Error> {
    let mut log_files = vec![];

    for file in files {
        let filename = file.filename;
        let log_entries = match parse_log_file(file.file) {
            Ok(entries) => entries,
            Err(e) => {
                eprintln!("{}", e);
                continue;
            }
        };

        log_files.push(LogFile {
            filename,
            log_entries,
        });
    }

    Ok(log_files)
}

pub fn log_file_search() -> Result<Vec<RawFile>, io::Error> {
    let root = std::env::current_dir()?;
    find_log_files(root)
}

fn find_log_files(path: PathBuf) -> Result<Vec<RawFile>, io::Error> {
    let mut files = vec![];

    let dir = match fs::read_dir(&path) {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("{}: {}", e, path.to_string_lossy().to_string());
            return Ok(vec![]);
        }
    };

    for entry in dir {
        let entry = match entry {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("{}", e);
                continue;
            }
        };

        let current_path = entry.path();
        if current_path.is_dir() {
            files.append(&mut find_log_files(current_path)?);
        } else {
            if let Some(ext) = current_path.extension() {
                let ext = ext.to_string_lossy();
                if ext == "log" {
                    let name = current_path
                        .file_name()
                        .map(|osstr| osstr.to_string_lossy().to_string())
                        .unwrap_or("Invalid filename".to_string());

                    let file = match File::open(&current_path) {
                        Ok(file) => file,
                        Err(e) => {
                            eprintln!("{}: {}", e, current_path.to_string_lossy().to_string());
                            continue;
                        }
                    };
                    files.push(RawFile {
                        filename: name,
                        file,
                    });
                }
            }
        }
    }
    Ok(files)
}

fn parse_log_file(file: File) -> Result<Vec<LogEntry>, io::Error> {
    let mut file = file;
    let mut buffer = String::new();
    file.read_to_string(&mut buffer)?;
    let mut log_entries = vec![];

    for (i, line) in buffer.lines().enumerate() {
        let i = i + 1;
        if line.contains("\tD\t") {
            log_entries.push(LogEntry::debug(i, line.to_string()));
        } else if line.contains("\tI\t") {
            log_entries.push(LogEntry::info(i, line.to_string()));
        } else if line.contains("\tW\t") {
            log_entries.push(LogEntry::warn(i, line.to_string()));
        } else if line.contains("\tE\t") {
            log_entries.push(LogEntry::error(i, line.to_string()));
        } else {
            log_entries.push(LogEntry::other(i, line.to_string()));
        }
    }

    Ok(log_entries)
}

fn launch_browser(url: &str) -> io::Result<()> {
    if cfg!(target_os = "windows") {
        let start_command = String::from("start ") + url;
        Command::new("cmd").args(&["/C", &start_command]).spawn()?;
    } else if cfg!(target_os = "macos") {
        let start_command = String::from("open ") + url;
        Command::new("sh").args(&["-c", &start_command]).spawn()?;
    } else {
        // should be the most cross platform method for opening the browser
        let start_command = String::from("xdg-open ") + url;
        Command::new("sh").args(&["-c", &start_command]).spawn()?;
    }

    Ok(())
}

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    if let Err(e) = launch_browser("http://127.0.0.1:8000/") {
        eprintln!("Failed to launch browser: {}", e);
    }

    let _rocket = rocket::build().mount("/", routes![index, get_log, get_logs]).launch().await?;

    Ok(())
}