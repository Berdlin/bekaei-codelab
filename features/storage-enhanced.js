


class EnhancedStorage {
    constructor() {
        this.supabase = null;
        this.bucketName = 'projects';
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        await this.ensureBucketExists();
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    async ensureBucketExists() {
        try {

            const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();

            if (listError) {
                console.error('Error listing buckets:', listError);
                return;
            }

            const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);

            if (!bucketExists) {

                const { error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
                    public: false,
                    fileSizeLimit: 100000000, 
                    allowedMimeTypes: ['text/*', 'application/*', 'image/*']
                });

                if (createError) {
                    console.error('Error creating bucket:', createError);
                } else {
                    console.log('Bucket created successfully');
                }
            }
        } catch (error) {
            console.error('Error ensuring bucket exists:', error);
        }
    }


    async uploadProject(roomId, files) {
        if (!roomId || !files || files.length === 0) {
            throw new Error('Invalid project data');
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const folderPath = `${roomId}/${timestamp}/`;

            const uploadPromises = files.map(async (file) => {
                const filePath = `${folderPath}${file.name}`;

                const { data, error } = await this.supabase.storage
                    .from(this.bucketName)
                    .upload(filePath, new Blob([file.content], { type: 'text/plain' }), {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;
                return { fileName: file.name, filePath: data.path };
            });

            const results = await Promise.all(uploadPromises);


            await this.saveBackupMetadata(roomId, results, files.length);

            return results;
        } catch (error) {
            console.error('Error uploading project:', error);
            throw error;
        }
    }


    async downloadProject(roomId, version = 'latest') {
        try {
            let folderPath;

            if (version === 'latest') {

                const { data: backups, error } = await this.supabase
                    .from('project_backups')
                    .select('folder_path')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (error || !backups || backups.length === 0) {
                    throw new Error('No backups found');
                }

                folderPath = backups[0].folder_path;
            } else {
                folderPath = version;
            }


            const { data: fileList, error: listError } = await this.supabase.storage
                .from(this.bucketName)
                .list(folderPath);

            if (listError) throw listError;

            const downloadPromises = fileList.map(async (file) => {
                const filePath = `${folderPath}/${file.name}`;

                const { data, error } = await this.supabase.storage
                    .from(this.bucketName)
                    .download(filePath);

                if (error) throw error;

                const text = await data.text();
                return {
                    name: file.name,
                    content: text,
                    lang: this.detectLanguage(file.name)
                };
            });

            const files = await Promise.all(downloadPromises);
            return files;
        } catch (error) {
            console.error('Error downloading project:', error);
            throw error;
        }
    }


    async listBackups(roomId) {
        try {
            const { data, error } = await this.supabase
                .from('project_backups')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error listing backups:', error);
            throw error;
        }
    }


    async createShareLink(roomId, expirationHours = 24) {
        try {

            const files = window.localFiles || [];
            const uploadResults = await this.uploadProject(roomId, files);


            const signedUrls = await Promise.all(uploadResults.map(async (result) => {
                const { data, error } = await this.supabase.storage
                    .from(this.bucketName)
                    .createSignedUrl(result.filePath, expirationHours * 3600);

                if (error) throw error;
                return {
                    fileName: result.fileName,
                    url: data.signedUrl
                };
            }));


            const shareData = {
                room_id: roomId,
                expires_at: new Date(Date.now() + expirationHours * 3600 * 1000).toISOString(),
                files: signedUrls
            };

            const { data: shareRecord, error: saveError } = await this.supabase
                .from('project_shares')
                .insert([shareData])
                .select()
                .single();

            if (saveError) throw saveError;

            return {
                shareId: shareRecord.id,
                expirationHours: expirationHours,
                files: signedUrls
            };
        } catch (error) {
            console.error('Error creating share link:', error);
            throw error;
        }
    }


    async restoreFromBackup(roomId, backupId) {
        try {
            const { data: backup, error } = await this.supabase
                .from('project_backups')
                .select('folder_path')
                .eq('id', backupId)
                .single();

            if (error || !backup) {
                throw new Error('Backup not found');
            }

            const files = await this.downloadProject(roomId, backup.folder_path);


            if (window.localFiles) {
                window.localFiles = [];
                window.openTabs = [];
                window.activeFileId = null;
            }

            files.forEach(file => {
                if (window.localFiles) {
                    window.localFiles.push({
                        id: 'backup-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        content: file.content,
                        lang: file.lang
                    });
                }
            });

            if (window.renderExplorer) window.renderExplorer();
            if (window.switchFile && files.length > 0) {
                window.switchFile(window.localFiles[0].id);
            }

            return files;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            throw error;
        }
    }


    async autoSaveProject(roomId) {
        if (!roomId || !window.localFiles || window.localFiles.length === 0) {
            return;
        }

        try {

            const lastSaveTime = localStorage.getItem(`last_save_${roomId}`);
            const now = Date.now();

            if (lastSaveTime && (now - parseInt(lastSaveTime)) < 300000) { 
                return; 
            }

            const files = window.localFiles.map(f => ({
                name: f.name,
                content: f.content,
                lang: f.lang
            }));

            await this.uploadProject(roomId, files);
            localStorage.setItem(`last_save_${roomId}`, now.toString());

            if (window.showToast) {
                window.showToast('Project auto-saved to cloud', 'success');
            }
        } catch (error) {
            console.error('Auto-save failed:', error);

        }
    }


    async exportProjectAsZip(roomId) {
        try {
            const files = window.localFiles || [];
            if (files.length === 0) {
                throw new Error('No files to export');
            }


            const zipData = {
                project_id: roomId,
                timestamp: new Date().toISOString(),
                files: files.map(f => ({
                    name: f.name,
                    content: f.content,
                    lang: f.lang
                }))
            };

            const blob = new Blob([JSON.stringify(zipData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${roomId}-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.showToast) {
                window.showToast('Project exported successfully', 'success');
            }
        } catch (error) {
            console.error('Export failed:', error);
            if (window.showToast) {
                window.showToast('Export failed: ' + error.message, 'error');
            }
        }
    }


    async saveBackupMetadata(roomId, files, fileCount) {
        try {
            const { error } = await this.supabase
                .from('project_backups')
                .insert([{
                    room_id: roomId,
                    folder_path: files[0]?.filePath?.split('/').slice(0, -1).join('/'),
                    file_count: fileCount,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving backup metadata:', error);
        }
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css',
            'py': 'python', 'rb': 'ruby', 'php': 'php', 'java': 'java',
            'c': 'c', 'cpp': 'cpp', 'cs': 'csharp', 'go': 'go', 'rs': 'rust',
            'json': 'json', 'md': 'markdown', 'txt': 'plaintext'
        };
        return languageMap[ext] || 'plaintext';
    }
}


window.enhancedStorage = new EnhancedStorage();


window.uploadProject = (roomId, files) => window.enhancedStorage.uploadProject(roomId, files);
window.downloadProject = (roomId, version) => window.enhancedStorage.downloadProject(roomId, version);
window.listBackups = (roomId) => window.enhancedStorage.listBackups(roomId);
window.createShareLink = (roomId, expirationHours) => window.enhancedStorage.createShareLink(roomId, expirationHours);
window.restoreFromBackup = (roomId, backupId) => window.enhancedStorage.restoreFromBackup(roomId, backupId);
window.autoSaveProject = (roomId) => window.enhancedStorage.autoSaveProject(roomId);
window.exportProjectAsZip = (roomId) => window.enhancedStorage.exportProjectAsZip(roomId);

