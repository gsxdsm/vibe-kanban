use db::models::project::Project;

/// Service for sending notifications to ntfy servers
#[derive(Debug, Clone, Default)]
pub struct NtfyService;

impl NtfyService {
    pub fn new() -> Self {
        Self
    }

    /// Send a notification to the project's configured ntfy server if enabled
    pub async fn notify_project(&self, project: &Project, title: &str, message: &str) {
        if !project.ntfy_enabled {
            return;
        }

        let Some(topic) = &project.ntfy_topic else {
            tracing::debug!("ntfy notifications enabled but no topic configured for project {}", project.id);
            return;
        };

        let url = project.ntfy_url.as_deref().unwrap_or("https://ntfy.sh");

        if let Err(e) = self.send_notification(url, topic, title, message).await {
            tracing::error!("Failed to send ntfy notification: {}", e);
        }
    }

    /// Send a notification to an ntfy server
    async fn send_notification(
        &self,
        server_url: &str,
        topic: &str,
        title: &str,
        message: &str,
    ) -> Result<(), NtfyError> {
        let url = format!("{}/{}", server_url.trim_end_matches('/'), topic);

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .header("Title", title)
            .body(message.to_string())
            .send()
            .await
            .map_err(|e| NtfyError::Request(e.to_string()))?;

        if !response.status().is_success() {
            return Err(NtfyError::Response(format!(
                "ntfy server returned status: {}",
                response.status()
            )));
        }

        tracing::info!("Sent ntfy notification to {}: {}", url, title);
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum NtfyError {
    #[error("Request failed: {0}")]
    Request(String),
    #[error("Response error: {0}")]
    Response(String),
}
