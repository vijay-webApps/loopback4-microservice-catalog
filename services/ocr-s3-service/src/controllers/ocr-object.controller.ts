import { inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { get, param, response } from '@loopback/rest';
import { HocrObject } from '../models';
import { HocrObjectRepository } from '../repositories';
import { IteratorService, S3HandlerService } from '../services';
import { GetObjectOutput, IListObject } from '../types';

export class OcrObjectController {
  constructor(
    @repository(HocrObjectRepository)
    public hocrObjectRepository: HocrObjectRepository,
    @inject('services.S3HandlerService') public s3Handler: S3HandlerService,
    @inject('services.IteratorService') public iteratorService: IteratorService,
  ) { }

  @get('/get-contract-hocr/{contract_name}')
  @response(200, {
    description: 'User model instance',
  })
  async getHocrFiles(
    @param.path.string('contract_name') contractName: string,
  ): Promise<void> {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const s3ObjectList: IListObject[] | undefined =
      await this.s3Handler.listObjects(
        process.env.BUCKET,
        process.env.BUCKET_PREFIX,
      );

    await this.iteratorService.asyncForEach(
      s3ObjectList!,
      async (value: IListObject) => {
        if (value.Key) {
          const data: GetObjectOutput = await this.s3Handler.getObject(
            process.env.BUCKET,
            value.Key,
          );
          const hocrContent: string = await this.s3Handler.streamToString(data);
          const contractData: Partial<HocrObject> = {
            contractName: contractName,
            type: 'HOCR',
            pageNo: Number(
              value.Key.split('/').pop()!.split('.').slice(0, 1).join(''),
            ),
            hocrData: hocrContent,
          };
          await this.hocrObjectRepository.create(contractData);
        }
      },
    );
  }

  @get('/contract-images/{contract_name}')
  @response(200, {
    description: 'User model instance',
  })
  async getImgFiles(
    @param.path.string('contract_name') contractName: string,
  ): Promise<void> {
    const s3ObjectList: IListObject[] | undefined =
      await this.s3Handler.listObjects(
        process.env.BUCKET,
        process.env.BUCKET_PREFIX,
      );

    await this.iteratorService.asyncForEach(
      s3ObjectList!,
      async (value: IListObject) => {
        if (value.Key) {
          const data: GetObjectOutput = await this.s3Handler.getObject(
            process.env.BUCKET,
            value.Key,
          );

          const imgContent: string = await this.s3Handler.streamToString(data);
          const contractData: any = {
            contractName: contractName,
            type: 'IMG',
            imgData: imgContent,
            pageNo: Number(
              value.Key.split('/').pop()!.split('.').slice(0, 1).join(''),
            ),
          };
          await this.hocrObjectRepository.create(contractData);
        }
      },
    );
  }
}
