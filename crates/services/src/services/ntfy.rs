use db::models::project::Project;
use reqwest::Client;

/// Service for sending notifications via ntfy.sh
#[derive(Clone)]
pub struct NtfyService {
    client: Client,
}

impl NtfyService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Send a notification to a project's configured ntfy topic (if enabled)
    pub async fn notify_project(&self, project: &Project, title: &str, message: &str) {
        if !project.ntfy_enabled {
            return;
        }

        let Some(topic) = project.ntfy_topic.as_ref() else {
            tracing::debug!("Project {} has ntfy enabled but no topic configured", project.id);
            return;
        };

        let base_url = project
            .ntfy_url
            .as_deref()
            .unwrap_or("https://ntfy.sh");

        let url = format!("{}/{}", base_url.trim_end_matches('/'), topic);

        match self
            .client
            .post(&url)
            .header("Title", title)
            .body(message.to_string())
            .send()
            .await
        {
            Ok(response) => {
                if !response.status().is_success() {
                    tracing::warn!(
                        "ntfy notification failed for project {}: HTTP {}",
                        project.id,
                        response.status()
                    );
                } else {
                    tracing::debug!("ntfy notification sent for project {}", project.id);
                }
            }
            Err(e) => {
                tracing::warn!("Failed to send ntfy notification for project {}: {}", project.id, e);
            }
        }
    }
}

impl Default for NtfyService {
    fn default() -> Self {
        Self::new()
    }
}
