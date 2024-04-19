export interface R2Config {
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: "auto";
}

export interface R2Error {
	Error: {
		Code: string;
		Message: string;
	};
}

export interface R2ListObjectsResult {
	Name: string;
	Contents?: R2ListObjectsItem[];
	IsTruncated: boolean;
	MaxKeys: number;
	KeyCount: number;
	NextContinuationToken?: string;
}

export interface R2ListObjectsItem {
	Key: string;
	LastModified: string;
	ETag: string;
	Size: number;
	StorageClass: string;
}
